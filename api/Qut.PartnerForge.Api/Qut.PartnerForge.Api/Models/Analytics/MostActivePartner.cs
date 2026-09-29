namespace Qut.PartnerForge.Api.Models.Analytics;

/// <summary>Keyless projection of <c>v_most_active_partners_3yr</c>.</summary>
public class MostActivePartner
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? IndustryName { get; set; }
    public long ProjectCount { get; set; }
}
