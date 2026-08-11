namespace Qut.PartnerForge.Api.Models.Analytics;

/// <summary>
/// Keyless projection of the <c>v_most_active_partners_3yr</c> SQL view: organisations
/// ranked by live project count over the trailing three years.
/// </summary>
public class MostActivePartner
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? IndustryName { get; set; }
    public long ProjectCount { get; set; }
}
