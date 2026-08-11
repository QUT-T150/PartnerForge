namespace Qut.PartnerForge.Api.Models.Analytics;

/// <summary>Headline counts for the analytics landing page, computed from the live tables.</summary>
/// <param name="TotalPartners">Organisations that have not been soft-deleted.</param>
/// <param name="ActivePartners">Organisations with <c>partnership_status = active</c>.</param>
/// <param name="ProspectPartners">Organisations with <c>partnership_status = prospect</c>.</param>
/// <param name="PartnersWithoutProjects">Live organisations that have never had a live project.</param>
/// <param name="TotalProjects">Live projects across all intakes.</param>
/// <param name="ProjectsThisYear">Live projects whose intake year matches the current year.</param>
/// <param name="PendingApplications">Applications still awaiting review.</param>
/// <param name="UpcomingEvents">Events dated today or later.</param>
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

/// <summary>Per-organisation engagement row served from <c>v_organisation_stats</c>.</summary>
/// <param name="Id">Organisation identifier.</param>
/// <param name="Name">Organisation display name.</param>
/// <param name="IndustryId">Industry classification identifier, null when unclassified.</param>
/// <param name="Industry">Industry display name, null when unclassified.</param>
/// <param name="PartnershipStatus">Workflow status of the partnership.</param>
/// <param name="TotalProjects">Live projects linked to the organisation.</param>
/// <param name="FirstProjectDate">Approximate start of the earliest intake, null when there are no projects.</param>
/// <param name="LastProjectDate">Approximate start of the most recent intake, null when there are no projects.</param>
/// <param name="EventsAttended">Distinct events the organisation has attended.</param>
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

/// <summary>Per-intake rollup served from <c>v_intake_summary</c>.</summary>
/// <param name="Year">Intake calendar year.</param>
/// <param name="Semester">Intake semester code (<c>S1</c>, <c>SS</c>, <c>S2</c>).</param>
/// <param name="Label">Human-readable intake label, for example <c>2026 S1</c>.</param>
/// <param name="TotalProjects">Projects delivered in the intake.</param>
/// <param name="UniquePartners">Distinct organisations involved in the intake.</param>
/// <param name="NewPartners">Organisations whose first ever intake is this one.</param>
/// <param name="ReturningPartners">Organisations that had appeared in an earlier intake.</param>
public record IntakeSummaryDto(
    int Year,
    string Semester,
    string Label,
    int TotalProjects,
    int UniquePartners,
    int NewPartners,
    int ReturningPartners
);

/// <summary>Ranked partner row served from <c>v_most_active_partners_3yr</c>.</summary>
/// <param name="Id">Organisation identifier.</param>
/// <param name="Name">Organisation display name.</param>
/// <param name="Industry">Industry display name, null when unclassified.</param>
/// <param name="ProjectCount">Live projects in the trailing three-year window.</param>
public record MostActivePartnerDto(
    Guid Id,
    string Name,
    string? Industry,
    int ProjectCount
);
