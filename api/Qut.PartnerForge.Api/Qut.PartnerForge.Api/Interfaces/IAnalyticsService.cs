using Qut.PartnerForge.Api.Models.Analytics;

namespace Qut.PartnerForge.Api.Interfaces;

/// <summary>
/// Read-only reporting queries backed by the three analytics views defined in <c>Schema/schema.sql</c>.
/// </summary>
/// <remarks>
/// The views already exclude soft-deleted rows, so implementations must not re-apply
/// <c>deleted_at</c> filters on top of them.
/// </remarks>
public interface IAnalyticsService
{
    /// <summary>
    /// Computes the headline counts shown above the charts.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<AnalyticsSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Lists per-organisation engagement rows, filtered and ordered by the caller.
    /// </summary>
    /// <param name="search">Optional organisation name substring.</param>
    /// <param name="industryId">Optional industry classification filter.</param>
    /// <param name="partnershipStatus">Optional partnership status filter.</param>
    /// <param name="sortBy">Whitelisted sort key; see <see cref="AnalyticsSortKeys"/>.</param>
    /// <param name="descending">Sorts high-to-low when true.</param>
    /// <param name="limit">Maximum rows to return; callers are expected to have clamped this.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<IReadOnlyList<OrganisationStatDto>> GetOrganisationStatsAsync(
        string? search,
        int? industryId,
        string? partnershipStatus,
        string sortBy,
        bool descending,
        int limit,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Lists intake rollups in chronological order (S1 before SS before S2 within a year).
    /// </summary>
    /// <param name="fromYear">Optional inclusive lower bound on intake year.</param>
    /// <param name="toYear">Optional inclusive upper bound on intake year.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<IReadOnlyList<IntakeSummaryDto>> GetIntakeSummaryAsync(
        int? fromYear,
        int? toYear,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Lists the most active partners over the trailing three years, highest project count first.
    /// </summary>
    /// <param name="limit">Maximum rows to return; callers are expected to have clamped this.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<IReadOnlyList<MostActivePartnerDto>> GetMostActivePartnersAsync(
        int limit,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Sort keys accepted by <see cref="IAnalyticsService.GetOrganisationStatsAsync"/>.
/// </summary>
/// <remarks>
/// The set is closed so a caller-supplied string can never reach the query as a column name.
/// </remarks>
public static class AnalyticsSortKeys
{
    /// <summary>Sort by organisation name.</summary>
    public const string Name = "name";

    /// <summary>Sort by live project count.</summary>
    public const string TotalProjects = "totalProjects";

    /// <summary>Sort by the most recent intake the organisation appeared in.</summary>
    public const string LastProjectDate = "lastProjectDate";

    /// <summary>Sort by distinct events attended.</summary>
    public const string EventsAttended = "eventsAttended";

    /// <summary>Every accepted sort key.</summary>
    public static readonly IReadOnlySet<string> All =
        new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            Name,
            TotalProjects,
            LastProjectDate,
            EventsAttended
        };

    /// <summary>Returns <paramref name="candidate"/> when it is whitelisted, otherwise the default key.</summary>
    /// <param name="candidate">Caller-supplied sort key, possibly null.</param>
    public static string Resolve(string? candidate) =>
        candidate != null && All.Contains(candidate) ? candidate : TotalProjects;
}
