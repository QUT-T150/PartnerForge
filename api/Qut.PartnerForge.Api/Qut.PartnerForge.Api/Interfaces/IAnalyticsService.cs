using Qut.PartnerForge.Api.Models.Analytics;

namespace Qut.PartnerForge.Api.Interfaces;

/// <summary>Read-only reporting over the three analytics views. They already exclude soft-deleted rows.</summary>
public interface IAnalyticsService
{
    /// <summary>Headline counts for the stat tiles.</summary>
    Task<AnalyticsSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default);

    /// <summary>Per-organisation engagement rows, filtered and ordered by the caller.</summary>
    Task<IReadOnlyList<OrganisationStatDto>> GetOrganisationStatsAsync(
        string? search,
        int? industryId,
        string? partnershipStatus,
        string sortBy,
        bool descending,
        int limit,
        CancellationToken cancellationToken = default);

    /// <summary>Intake rollups in chronological order (S1, SS, S2).</summary>
    Task<IReadOnlyList<IntakeSummaryDto>> GetIntakeSummaryAsync(
        int? fromYear,
        int? toYear,
        CancellationToken cancellationToken = default);

    /// <summary>Most active partners over the trailing three years.</summary>
    Task<IReadOnlyList<MostActivePartnerDto>> GetMostActivePartnersAsync(
        int limit,
        CancellationToken cancellationToken = default);

    /// <summary>Events dated today or later, soonest first.</summary>
    Task<IReadOnlyList<UpcomingEventDto>> GetUpcomingEventsAsync(
        int limit,
        CancellationToken cancellationToken = default);
}

/// <summary>Accepted sort keys. Closed set, so caller input never reaches SQL as a column name.</summary>
public static class AnalyticsSortKeys
{
    /// <summary>Sort by organisation name.</summary>
    public const string Name = "name";

    /// <summary>Sort by live project count.</summary>
    public const string TotalProjects = "totalProjects";

    /// <summary>Sort by most recent intake.</summary>
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

    /// <summary>Returns the candidate when whitelisted, otherwise the default key.</summary>
    public static string Resolve(string? candidate) =>
        candidate != null && All.Contains(candidate) ? candidate : TotalProjects;
}
