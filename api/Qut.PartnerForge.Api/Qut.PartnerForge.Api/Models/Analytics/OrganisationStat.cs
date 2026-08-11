namespace Qut.PartnerForge.Api.Models.Analytics;

/// <summary>
/// Keyless projection of the <c>v_organisation_stats</c> SQL view: one row per live
/// organisation with its project rollup, engagement window, and event attendance.
/// </summary>
/// <remarks>
/// Counts are declared as <see cref="long"/> because MySQL <c>COUNT()</c> returns <c>BIGINT</c>.
/// Column names are mapped by the snake_case convention loop in
/// <see cref="Qut.PartnerForge.Api.Data.ApplicationDbContext.OnModelCreating"/>.
/// </remarks>
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
