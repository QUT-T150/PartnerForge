namespace Qut.PartnerForge.Api.Models.Analytics;

/// <summary>Headline counts for the analytics page.</summary>
public record AnalyticsSummaryDto(
    int TotalPartners,
    int ActivePartners,
    int ProspectPartners,
    int PartnersWithoutProjects,
    int TotalProjects,
    int ProjectsThisYear,
    int PendingApplications,
    int UpcomingEvents
);

/// <summary>Per-organisation engagement row from <c>v_organisation_stats</c>.</summary>
public record OrganisationStatDto(
    Guid Id,
    string Name,
    int? IndustryId,
    string? Industry,
    string PartnershipStatus,
    int TotalProjects,
    DateOnly? FirstProjectDate,
    DateOnly? LastProjectDate,
    int EventsAttended
);

/// <summary>Per-intake rollup from <c>v_intake_summary</c>.</summary>
public record IntakeSummaryDto(
    int Year,
    string Semester,
    string Label,
    int TotalProjects,
    int UniquePartners,
    int NewPartners,
    int ReturningPartners
);

/// <summary>Ranked partner row from <c>v_most_active_partners_3yr</c>.</summary>
public record MostActivePartnerDto(
    Guid Id,
    string Name,
    string? Industry,
    int ProjectCount
);

/// <summary>Event dated today or later, with the number of partner organisations registered.</summary>
public record UpcomingEventDto(
    Guid Id,
    string Name,
    string? EventType,
    DateOnly EventDate,
    string? Location,
    int OrganisationsAttending
);
