using Qut.PartnerForge.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Security.Claims;
using System.Text.Json;

namespace Qut.PartnerForge.Api.Interceptors;

/// <summary>
/// Writes an <see cref="AuditLog"/> row for every create/update/delete flowing through
/// <see cref="DbContext.SaveChanges()"/>, per the schema design doc's recommendation to audit from
/// the API layer so the acting user and IP are captured (DB triggers can't see either).
/// Audit rows are added to the same save, so they commit — or roll back — with the change itself.
/// </summary>
public class AuditSaveChangesInterceptor : SaveChangesInterceptor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    /// <summary>Columns whose values must never be snapshotted into the audit trail.</summary>
    private static readonly HashSet<string> SensitiveColumns = new(StringComparer.OrdinalIgnoreCase)
    {
        "password_hash"
    };

    /// <summary>
    /// Initializes a new instance of <see cref="AuditSaveChangesInterceptor"/>.
    /// </summary>
    /// <param name="httpContextAccessor">Source of the acting user's claims, IP, and user agent.</param>
    public AuditSaveChangesInterceptor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    /// <inheritdoc />
    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData, InterceptionResult<int> result)
    {
        AppendAuditRows(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    /// <inheritdoc />
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        AppendAuditRows(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void AppendAuditRows(DbContext? context)
    {
        if (context == null) return;

        var httpContext = _httpContextAccessor.HttpContext;
        Guid? changedBy =
            Guid.TryParse(httpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)
                ? userId
                : null;
        var ipAddress = httpContext?.Connection.RemoteIpAddress?.ToString();
        var userAgent = httpContext?.Request.Headers.UserAgent.ToString();
        var now = DateTime.UtcNow;

        // Snapshot the entries first: adding AuditLog rows below mutates the change tracker.
        var entries = context.ChangeTracker.Entries()
            .Where(e => e.Entity is not AuditLog &&
                        e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .ToList();

        var rows = new List<AuditLog>();
        foreach (var entry in entries)
        {
            // Audit only entities keyed by a single Guid — matches audit_log.record_id CHAR(36).
            // The composite-keyed role_permissions join is seed/lookup data with no API write path.
            if (entry.Properties.FirstOrDefault(p => p.Metadata.IsPrimaryKey())?.CurrentValue
                    is not Guid recordId)
                continue;

            var row = BuildRow(entry, recordId);
            if (row == null) continue;

            row.ChangedBy = changedBy;
            row.ChangedAt = now;
            row.IpAddress = ipAddress;
            row.UserAgent = string.IsNullOrEmpty(userAgent) ? null : userAgent;
            rows.Add(row);
        }

        if (rows.Count > 0)
            context.Set<AuditLog>().AddRange(rows);
    }

    private static AuditLog? BuildRow(EntityEntry entry, Guid recordId)
    {
        var tableName = entry.Metadata.GetTableName() ?? entry.Metadata.ClrType.Name;

        switch (entry.State)
        {
            case EntityState.Added:
                return new AuditLog
                {
                    TableName = tableName,
                    RecordId = recordId,
                    Action = "INSERT",
                    NewValues = SerializeValues(entry, p => p.CurrentValue)
                };

            case EntityState.Deleted:
                return new AuditLog
                {
                    TableName = tableName,
                    RecordId = recordId,
                    Action = "DELETE",
                    OldValues = SerializeValues(entry, p => p.OriginalValue)
                };

            case EntityState.Modified:
                var modified = entry.Properties
                    .Where(p => p.IsModified && !Equals(p.OriginalValue, p.CurrentValue))
                    .ToList();
                if (modified.Count == 0) return null; // no-op save — nothing to audit

                return new AuditLog
                {
                    TableName = tableName,
                    RecordId = recordId,
                    Action = ResolveModifiedAction(entry),
                    OldValues = SerializeValues(modified, p => p.OriginalValue),
                    NewValues = SerializeValues(modified, p => p.CurrentValue)
                };

            default:
                return null;
        }
    }

    /// <summary>
    /// Soft deletes and restores are updates in EF terms; the <c>deleted_at</c> transition tells
    /// them apart so they land as their own <c>audit_log.action</c> values.
    /// </summary>
    private static string ResolveModifiedAction(EntityEntry entry)
    {
        var deletedAt = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "DeletedAt");
        if (deletedAt is { IsModified: true })
        {
            if (deletedAt.OriginalValue == null && deletedAt.CurrentValue != null)
                return "SOFT_DELETE";
            if (deletedAt.OriginalValue != null && deletedAt.CurrentValue == null)
                return "RESTORE";
        }
        return "UPDATE";
    }

    private static string SerializeValues(EntityEntry entry, Func<PropertyEntry, object?> selector) =>
        SerializeValues(entry.Properties.ToList(), selector);

    private static string SerializeValues(
        IReadOnlyList<PropertyEntry> properties, Func<PropertyEntry, object?> selector)
    {
        var values = new Dictionary<string, object?>();
        foreach (var property in properties)
        {
            var columnName = property.Metadata.GetColumnName() ?? property.Metadata.Name;
            values[columnName] = SensitiveColumns.Contains(columnName)
                ? "[REDACTED]"
                : selector(property);
        }
        return JsonSerializer.Serialize(values);
    }
}
