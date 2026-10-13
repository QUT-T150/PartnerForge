using Microsoft.Extensions.Diagnostics.HealthChecks;
using Qut.PartnerForge.Api.Data;

namespace Qut.PartnerForge.Api.HealthChecks;

/// <summary>
/// Reports whether the API can reach its MySQL database. Backs <c>GET /health</c>,
/// which docker compose polls so the frontend only starts once the API can serve data.
/// </summary>
public class DatabaseHealthCheck : IHealthCheck
{
    private readonly ApplicationDbContext _db;

    /// <summary>Creates the check against the request-scoped database context.</summary>
    public DatabaseHealthCheck(ApplicationDbContext db)
    {
        _db = db;
    }

    /// <summary>Healthy when a connection to the database can be opened; otherwise Unhealthy.</summary>
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        // CanConnectAsync swallows connection errors and returns false, so this never throws for a down database.
        return await _db.Database.CanConnectAsync(cancellationToken)
            ? HealthCheckResult.Healthy("Database reachable.")
            : HealthCheckResult.Unhealthy("Database unreachable.");
    }
}
