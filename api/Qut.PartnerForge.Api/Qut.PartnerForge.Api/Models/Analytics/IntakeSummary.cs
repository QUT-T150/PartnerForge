namespace Qut.PartnerForge.Api.Models.Analytics;

/// <summary>Keyless projection of <c>v_intake_summary</c>. The view counts a partner as new only in their first intake.</summary>
public class IntakeSummary
{
    public int Year { get; set; }
    public string Semester { get; set; } = string.Empty;
    public long TotalProjects { get; set; }
    public long UniquePartners { get; set; }
    public long NewPartners { get; set; }
    public long ReturningPartners { get; set; }
}
