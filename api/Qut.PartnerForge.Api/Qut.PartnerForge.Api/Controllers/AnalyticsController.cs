using Qut.PartnerForge.Api.Interfaces;
using Qut.PartnerForge.Api.Models.Analytics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Qut.PartnerForge.Api.Controllers;

/// <summary>
/// Read-only reporting endpoints. Admin and course_organiser only, matching the frontend
/// permission matrix. Not faculty-scoped — the views aggregate across the whole dataset.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "admin,course_organiser,industry_team_manager")]
public class AnalyticsController : ControllerBase
{
    private const int DefaultOrganisationLimit = 100;
    private const int DefaultPartnerLimit = 10;
    private const int DefaultEventLimit = 5;
    private const int MaxLimit = 500;

    private readonly IAnalyticsService _analytics;

    /// <summary>Initializes a new instance of <see cref="AnalyticsController"/>.</summary>
    public AnalyticsController(IAnalyticsService analytics)
    {
        _analytics = analytics;
    }

    /// <summary>Headline counts for the stat tiles.</summary>
    [HttpGet("summary")]
    public async Task<ActionResult<AnalyticsSummaryDto>> GetSummary(CancellationToken cancellationToken)
    {
        return Ok(await _analytics.GetSummaryAsync(cancellationToken));
    }

    /// <summary>Per-organisation engagement rows. Unrecognised sort keys fall back to <c>totalProjects</c>; <c>limit</c> clamps to 1–500.</summary>
    [HttpGet("organisations")]
    public async Task<ActionResult<IEnumerable<OrganisationStatDto>>> GetOrganisationStats(
        [FromQuery] string? search,
        [FromQuery] int? industryId,
        [FromQuery] string? status,
        [FromQuery] string? sortBy,
        [FromQuery] string? sortDirection,
        [FromQuery] int? limit,
        CancellationToken cancellationToken)
    {
        var rows = await _analytics.GetOrganisationStatsAsync(
            search,
            industryId,
            status,
            AnalyticsSortKeys.Resolve(sortBy),
            !string.Equals(sortDirection, "asc", StringComparison.OrdinalIgnoreCase),
            Clamp(limit, DefaultOrganisationLimit),
            cancellationToken);

        return Ok(rows);
    }

    /// <summary>Intake rollups in chronological order.</summary>
    [HttpGet("intakes")]
    public async Task<ActionResult<IEnumerable<IntakeSummaryDto>>> GetIntakes(
        [FromQuery] int? fromYear,
        [FromQuery] int? toYear,
        CancellationToken cancellationToken)
    {
        if (fromYear.HasValue && toYear.HasValue && fromYear > toYear)
            return BadRequest("fromYear must not be greater than toYear.");

        return Ok(await _analytics.GetIntakeSummaryAsync(fromYear, toYear, cancellationToken));
    }

    /// <summary>Most active partners over the trailing three years.</summary>
    [HttpGet("most-active-partners")]
    public async Task<ActionResult<IEnumerable<MostActivePartnerDto>>> GetMostActivePartners(
        [FromQuery] int? limit,
        CancellationToken cancellationToken)
    {
        var rows = await _analytics.GetMostActivePartnersAsync(
            Clamp(limit, DefaultPartnerLimit),
            cancellationToken);

        return Ok(rows);
    }

    /// <summary>Events dated today or later, soonest first. <c>limit</c> clamps to 1-500.</summary>
    [HttpGet("upcoming-events")]
    public async Task<ActionResult<IEnumerable<UpcomingEventDto>>> GetUpcomingEvents(
        [FromQuery] int? limit,
        CancellationToken cancellationToken)
    {
        var rows = await _analytics.GetUpcomingEventsAsync(
            Clamp(limit, DefaultEventLimit),
            cancellationToken);

        return Ok(rows);
    }

    /// <summary>Clamps a caller-supplied row cap into the accepted range.</summary>
    private static int Clamp(int? requested, int fallback) =>
        requested is null ? fallback : Math.Clamp(requested.Value, 1, MaxLimit);
}
