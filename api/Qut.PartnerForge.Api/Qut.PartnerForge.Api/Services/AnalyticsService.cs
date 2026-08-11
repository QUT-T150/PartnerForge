using Qut.PartnerForge.Api.Data;
using Qut.PartnerForge.Api.Interfaces;
using Qut.PartnerForge.Api.Models.Analytics;
using Microsoft.EntityFrameworkCore;

namespace Qut.PartnerForge.Api.Services;

/// <summary>
/// Entity Framework implementation of <see cref="IAnalyticsService"/>.
/// </summary>
/// <remarks>
/// Rollups are read from the SQL views rather than recomputed in LINQ so the aggregation
/// logic lives in one place — <c>Schema/schema.sql</c>. Only the headline summary queries
/// the base tables, because it counts rows the views do not expose.
/// </remarks>
public class AnalyticsService : IAnalyticsService
{
    private readonly ApplicationDbContext _context;

    /// <summary>
    /// Initializes a new instance of <see cref="AnalyticsService"/>.
    /// </summary>
    /// <param name="context">Database context.</param>
    public AnalyticsService(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <inheritdoc />
    public async Task<AnalyticsSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default)
    {
        var currentYear = DateTime.UtcNow.Year;
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);

        var organisations = _context.Organisations.AsNoTracking().Where(o => o.DeletedAt == null);
        var projects = _context.Projects.AsNoTracking().Where(p => p.DeletedAt == null);

        return new AnalyticsSummaryDto(
            await organisations.CountAsync(cancellationToken),
            await organisations.CountAsync(o => o.PartnershipStatus == "active", cancellationToken),
            await organisations.CountAsync(o => o.PartnershipStatus == "prospect", cancellationToken),
            await organisations.CountAsync(o => !o.Projects.Any(p => p.DeletedAt == null), cancellationToken),
            await projects.CountAsync(cancellationToken),
            await projects.CountAsync(p => p.Year == currentYear, cancellationToken),
            await _context.ProjectApplications.AsNoTracking()
                .CountAsync(a => a.DeletedAt == null && a.ApplicationStatus == "pending", cancellationToken),
            await _context.Events.AsNoTracking()
                .CountAsync(e => e.DeletedAt == null && e.EventDate >= today, cancellationToken)
        );
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<OrganisationStatDto>> GetOrganisationStatsAsync(
        string? search,
        int? industryId,
        string? partnershipStatus,
        string sortBy,
        bool descending,
        int limit,
        CancellationToken cancellationToken = default)
    {
        var query = _context.OrganisationStats.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(o => o.Name.Contains(search));

        if (industryId.HasValue)
            query = query.Where(o => o.IndustryId == industryId.Value);

        if (!string.IsNullOrWhiteSpace(partnershipStatus))
            query = query.Where(o => o.PartnershipStatus == partnershipStatus);

        // Materialised before projecting: the view's COUNT() columns arrive as BIGINT,
        // and narrowing them inside the query would push a CAST into SQL for no gain
        // on a result set the caller has already capped.
        var rows = await ApplySort(query, sortBy, descending)
            .Take(limit)
            .ToListAsync(cancellationToken);

        return rows
            .Select(o => new OrganisationStatDto(
                o.Id,
                o.Name,
                o.IndustryId,
                o.IndustryName,
                o.PartnershipStatus,
                (int)o.TotalProjects,
                o.FirstProjectDate,
                o.LastProjectDate,
                (int)o.EventsAttended
            ))
            .ToList();
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<IntakeSummaryDto>> GetIntakeSummaryAsync(
        int? fromYear,
        int? toYear,
        CancellationToken cancellationToken = default)
    {
        var query = _context.IntakeSummaries.AsNoTracking();

        if (fromYear.HasValue)
            query = query.Where(i => i.Year >= fromYear.Value);

        if (toYear.HasValue)
            query = query.Where(i => i.Year <= toYear.Value);

        var rows = await query.ToListAsync(cancellationToken);

        // Sorted in memory: intake order is S1 < SS < S2, which the view cannot express
        // without leaking its internal sort key into the projection.
        return rows
            .OrderBy(i => i.Year)
            .ThenBy(i => SemesterOrder(i.Semester))
            .Select(i => new IntakeSummaryDto(
                i.Year,
                i.Semester,
                $"{i.Year} {i.Semester}",
                (int)i.TotalProjects,
                (int)i.UniquePartners,
                (int)i.NewPartners,
                (int)i.ReturningPartners
            ))
            .ToList();
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<MostActivePartnerDto>> GetMostActivePartnersAsync(
        int limit,
        CancellationToken cancellationToken = default)
    {
        var rows = await _context.MostActivePartners.AsNoTracking()
            .OrderByDescending(p => p.ProjectCount)
            .ThenBy(p => p.Name)
            .Take(limit)
            .ToListAsync(cancellationToken);

        return rows
            .Select(p => new MostActivePartnerDto(
                p.Id,
                p.Name,
                p.IndustryName,
                (int)p.ProjectCount
            ))
            .ToList();
    }

    /// <summary>
    /// Applies a whitelisted sort key, falling back to project count for anything unrecognised.
    /// </summary>
    /// <param name="query">Source query over the organisation stats view.</param>
    /// <param name="sortBy">Sort key already resolved by <see cref="AnalyticsSortKeys.Resolve"/>.</param>
    /// <param name="descending">Sorts high-to-low when true.</param>
    private static IQueryable<OrganisationStat> ApplySort(
        IQueryable<OrganisationStat> query,
        string sortBy,
        bool descending)
    {
        if (string.Equals(sortBy, AnalyticsSortKeys.Name, StringComparison.OrdinalIgnoreCase))
        {
            return descending
                ? query.OrderByDescending(o => o.Name)
                : query.OrderBy(o => o.Name);
        }

        if (string.Equals(sortBy, AnalyticsSortKeys.LastProjectDate, StringComparison.OrdinalIgnoreCase))
        {
            return descending
                ? query.OrderByDescending(o => o.LastProjectDate).ThenBy(o => o.Name)
                : query.OrderBy(o => o.LastProjectDate).ThenBy(o => o.Name);
        }

        if (string.Equals(sortBy, AnalyticsSortKeys.EventsAttended, StringComparison.OrdinalIgnoreCase))
        {
            return descending
                ? query.OrderByDescending(o => o.EventsAttended).ThenBy(o => o.Name)
                : query.OrderBy(o => o.EventsAttended).ThenBy(o => o.Name);
        }

        return descending
            ? query.OrderByDescending(o => o.TotalProjects).ThenBy(o => o.Name)
            : query.OrderBy(o => o.TotalProjects).ThenBy(o => o.Name);
    }

    /// <summary>
    /// Maps a semester code to its position within an academic year.
    /// </summary>
    /// <param name="semester">Semester code (<c>S1</c>, <c>SS</c>, <c>S2</c>).</param>
    private static int SemesterOrder(string semester) => semester switch
    {
        "S1" => 1,
        "SS" => 2,
        "S2" => 3,
        _ => 4
    };
}
