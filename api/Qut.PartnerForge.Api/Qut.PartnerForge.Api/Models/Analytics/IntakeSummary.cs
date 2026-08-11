namespace Qut.PartnerForge.Api.Models.Analytics;

/// <summary>
/// Keyless projection of the <c>v_intake_summary</c> SQL view: one row per year and
/// semester, splitting the partners in that intake into first-timers and returners.
/// </summary>
/// <remarks>
/// The view decides "new" by comparing each intake against the partner's earliest
/// intake across the whole dataset, so a partner counts as new exactly once.
/// </remarks>
public class IntakeSummary
{
    public int Year { get; set; }
    public string Semester { get; set; } = string.Empty;
    public long TotalProjects { get; set; }
    public long UniquePartners { get; set; }
    public long NewPartners { get; set; }
    public long ReturningPartners { get; set; }
}
