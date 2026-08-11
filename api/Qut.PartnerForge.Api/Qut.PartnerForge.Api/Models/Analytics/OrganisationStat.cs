namespace Qut.PartnerForge.Api.Models.Analytics;

/// <summary>Keyless projection of <c>v_organisation_stats</c>. Counts are <see cref="long"/> because MySQL <c>COUNT()</c> returns BIGINT.</summary>
public class OrganisationStat
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? IndustryId { get; set; }
    public string? IndustryName { get; set; }
    public string PartnershipStatus { get; set; } = string.Empty;
    public long TotalProjects { get; set; }
    public DateOnly? FirstProjectDate { get; set; }
    public DateOnly? LastProjectDate { get; set; }
    public long EventsAttended { get; set; }
}
