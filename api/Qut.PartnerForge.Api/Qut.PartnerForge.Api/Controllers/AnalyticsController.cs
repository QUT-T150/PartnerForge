using Qut.PartnerForge.Api.Interfaces;
using Qut.PartnerForge.Api.Models.Analytics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Qut.PartnerForge.Api.Controllers;

/// <summary>
/// Read-only reporting endpoints over the analytics views.
/// </summary>
/// <remarks>
/// Restricted to <c>admin</c> and <c>course_organiser</c>, matching the <c>analytics</c> entry in
/// the frontend permission matrix. Industry partners have no access: the rollups span every
/// organisation, so there is no safe partner-scoped projection of them.
/// <para>
/// These figures are not faculty-scoped. The views aggregate across the whole dataset, and a
/// course organiser seeing partial totals labelled as totals would be worse than seeing none.
/// If per-faculty reporting is wanted, it belongs in the views rather than here.
/// </para>
/// </remarks>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "admin,course_organiser")]
public class AnalyticsController : ControllerBase
{
    private const int DefaultOrganisationLimit = 100;
    private const int DefaultPartnerLimit = 10;
    private const int MaxLimit = 500;

    private readonly IAnalyticsService _analytics;

    /// <summary>
    /// Initializes a new instance of <see cref="AnalyticsController"/>.
    /// </summary>
    /// <param name="analytics">Reporting query service.</param>
    public AnalyticsController(IAnalyticsService analytics)
    {
        _analytics = analytics;
    }

    /// <summary>
    /// Returns the headline counts rendered as stat tiles above the charts.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    [HttpGet("summary")]
    public async Task<ActionResult<AnalyticsSummaryDto>> GetSummary(CancellationToken cancellationToken)
    {
        return Ok(await _analytics.GetSummaryAsync(cancellationToken));
    }

    /// <summary>
    /// Lists per-organisation engagement rows from <c>v_organisation_stats</c>.
    /// </summary>
    /// <param name="search">Optional organisation name substring.</param>
    /// <param name="industryId">Optional industry classification filter.</param>
    /// <param name="status">Optional partnership status filter.</param>
    /// <param name="sortBy">One of <c>name</c>, <c>totalProjects</c>, <c>lastProjectDate</c>, <c>eventsAttended</c>. Unrecognised values fall back to <c>totalProjects</c>.</param>
    /// <param name="sortDirection">Either <c>asc</c> or <c>desc</c>; defaults to <c>desc</c>.</param>
    /// <param name="limit">Row cap, clamped to 1–500.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
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

    /// <summary>
    /// Lists intake rollups from <c>v_intake_summary</c> in chronological order.
    /// </summary>
    /// <param name="fromYear">Optional inclusive lower bound on intake year.</param>
    /// <param name="toYear">Optional inclusive upper bound on intake year.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
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

    /// <summary>
    /// Lists the most active partners over the trailing three years.
    /// </summary>
    /// <param name="limit">Row cap, clamped to 1–500.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
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

    /// <summary>
    /// Clamps a caller-supplied row cap into the accepted range.
    /// </summary>
    /// <param name="requested">Requested cap, null when the caller did not specify one.</param>
    /// <param name="fallback">Value used when <paramref name="requested"/> is null.</param>
    private static int Clamp(int? requested, int fallback) =>
        requested is null ? fallback : Math.Clamp(requested.Value, 1, MaxLimit);
}
