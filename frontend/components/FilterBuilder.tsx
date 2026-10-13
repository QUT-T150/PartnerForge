"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createSavedFilter,
  deleteSavedFilter,
  fetchFilterableFields,
  fetchRelationships,
  fetchSavedFilters,
  searchEntity,
  type FilterableField,
  type FilterItem,
  type RelatedFilterGroup,
  type RelationshipDescriptor,
  type SavedFilter,
  type SearchRequest,
  type SearchResponse,
} from "@/lib/api/search";
import {
  SlidersHorizontal,
  ChevronDown,
  Plus,
  X,
  Layers,
  Bookmark,
  RotateCcw,
  Trash2,
} from "lucide-react";
import styles from "./FilterBuilder.module.css";

interface FilterBuilderProps<T = Record<string, unknown>> {
  entity: string;
  onResults: (data: SearchResponse<T>) => void;
  onRequestChange?: (request: SearchRequest) => void;
  pageSize?: number;
  sortBy?: string | null;
  sortDirection?: "asc" | "desc";
}

interface FilterRow {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface RelatedGroup {
  id: string;
  entity: string;
  quantifier: "any" | "none";
  rows: FilterRow[];
  fields: FilterableField[];
  fieldsLoading: boolean;
}

const OPERATORS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  text: [
    { value: "equals", label: "equals" },
    { value: "contains", label: "contains" },
  ],
  number: [
    { value: "equals", label: "equals" },
    { value: "greaterThan", label: "greater than" },
    { value: "lessThan", label: "less than" },
  ],
  select: [{ value: "equals", label: "equals" }],
  date: [
    { value: "equals", label: "on" },
    { value: "greaterThan", label: "after" },
    { value: "lessThan", label: "before" },
  ],
};

function createEmptyRow(): FilterRow {
  return {
    id: crypto.randomUUID(),
    field: "",
    operator: "equals",
    value: "",
  };
}

function toRows(filters: FilterItem[]): FilterRow[] {
  return filters.map((filter) => ({
    id: crypto.randomUUID(),
    field: filter.field,
    operator: filter.operator,
    value: filter.value,
  }));
}

function toValidFilters(rows: FilterRow[]): FilterItem[] {
  return rows
    .filter((row) => row.field.trim() && row.value.trim())
    .map(({ field, operator, value }) => ({ field, operator, value }));
}

function toRelatedFilterGroups(groups: RelatedGroup[]): RelatedFilterGroup[] {
  return groups
    .filter((g) => g.entity && toValidFilters(g.rows).length > 0)
    .map((g) => ({
      entity: g.entity,
      quantifier: g.quantifier,
      filters: toValidFilters(g.rows),
    }));
}

export default function FilterBuilder<T = Record<string, unknown>>({
  entity,
  onResults,
  onRequestChange,
  pageSize = 25,
  sortBy = null,
  sortDirection = "asc",
}: FilterBuilderProps<T>) {
  const [fields, setFields] = useState<FilterableField[]>([]);
  const [relationships, setRelationships] = useState<
    RelationshipDescriptor[]
  >([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [rows, setRows] = useState<FilterRow[]>([]);
  const [relatedGroups, setRelatedGroups] = useState<RelatedGroup[]>([]);
  const [selectedSavedFilterId, setSelectedSavedFilterId] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialising, setInitialising] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveMode, setSaveMode] = useState(false);
  const [saveName, setSaveName] = useState("");

  const activeFilters = useMemo(() => toValidFilters(rows), [rows]);
  const activeRelated = useMemo(
    () => toRelatedFilterGroups(relatedGroups),
    [relatedGroups],
  );
  const totalRelatedConditions = activeRelated.reduce(
    (sum, g) => sum + g.filters.length,
    0,
  );
  const totalActive = activeFilters.length + totalRelatedConditions;

  const selectedSavedFilter = savedFilters.find(
    (filter) => filter.id === selectedSavedFilterId,
  );

  const runSearch = useCallback(
    async (
      filters: FilterItem[],
      related: RelatedFilterGroup[],
      page = 1,
    ) => {
      const request: SearchRequest = {
        filters,
        relatedFilters: related.length > 0 ? related : undefined,
        sortBy,
        sortDirection,
        page,
        pageSize,
      };

      setLoading(true);
      setError(null);
      onRequestChange?.(request);

      try {
        const results = await searchEntity<T>(entity, request);
        onResults(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed.");
      } finally {
        setLoading(false);
      }
    },
    [entity, onRequestChange, onResults, pageSize, sortBy, sortDirection],
  );

  const refreshSavedFilters = useCallback(async () => {
    const saved = await fetchSavedFilters(entity);
    setSavedFilters(saved);
  }, [entity]);

  useEffect(() => {
    let active = true;

    async function initialise() {
      setInitialising(true);
      setError(null);

      try {
        const [fieldResults, savedResults, relResults] = await Promise.all([
          fetchFilterableFields(entity),
          fetchSavedFilters(entity),
          fetchRelationships(entity),
        ]);

        if (!active) return;
        setFields(fieldResults);
        setSavedFilters(savedResults);
        setRelationships(relResults);
        await runSearch([], [], 1);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to load filters.",
          );
        }
      } finally {
        if (active) setInitialising(false);
      }
    }

    initialise();

    return () => {
      active = false;
    };
  }, [entity, runSearch]);

  // ── Direct filter row helpers ──

  function updateRow(id: string, patch: Partial<FilterRow>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function handleFieldChange(row: FilterRow, fieldName: string) {
    updateRow(row.id, {
      field: fieldName,
      operator: "equals",
      value: "",
    });
  }

  // ── Related group helpers ──

  function addRelatedGroup() {
    setRelatedGroups((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        entity: "",
        quantifier: "any",
        rows: [],
        fields: [],
        fieldsLoading: false,
      },
    ]);
  }

  function removeRelatedGroup(groupId: string) {
    setRelatedGroups((current) => current.filter((g) => g.id !== groupId));
  }

  function updateRelatedGroup(groupId: string, patch: Partial<RelatedGroup>) {
    setRelatedGroups((current) =>
      current.map((g) => (g.id === groupId ? { ...g, ...patch } : g)),
    );
  }

  async function handleRelatedEntityChange(
    groupId: string,
    newEntity: string,
  ) {
    updateRelatedGroup(groupId, {
      entity: newEntity,
      rows: [],
      fields: [],
      fieldsLoading: true,
    });

    if (!newEntity) {
      updateRelatedGroup(groupId, { fieldsLoading: false });
      return;
    }

    try {
      const relatedFields = await fetchFilterableFields(newEntity);
      updateRelatedGroup(groupId, {
        fields: relatedFields,
        fieldsLoading: false,
      });
    } catch {
      updateRelatedGroup(groupId, { fieldsLoading: false });
    }
  }

  function updateRelatedRow(
    groupId: string,
    rowId: string,
    patch: Partial<FilterRow>,
  ) {
    setRelatedGroups((current) =>
      current.map((g) =>
        g.id === groupId
          ? {
              ...g,
              rows: g.rows.map((r) =>
                r.id === rowId ? { ...r, ...patch } : r,
              ),
            }
          : g,
      ),
    );
  }

  function addRelatedRow(groupId: string) {
    setRelatedGroups((current) =>
      current.map((g) =>
        g.id === groupId ? { ...g, rows: [...g.rows, createEmptyRow()] } : g,
      ),
    );
  }

  function removeRelatedRow(groupId: string, rowId: string) {
    setRelatedGroups((current) =>
      current.map((g) =>
        g.id === groupId
          ? { ...g, rows: g.rows.filter((r) => r.id !== rowId) }
          : g,
      ),
    );
  }

  // ── Actions ──

  async function handleApply() {
    await runSearch(activeFilters, toRelatedFilterGroups(relatedGroups), 1);
  }

  async function handleClear() {
    setRows([]);
    setRelatedGroups([]);
    setSelectedSavedFilterId("");
    await runSearch([], [], 1);
  }

  async function handleSaveConfirm() {
    const trimmed = saveName.trim();
    if (!trimmed) return;

    const filters = activeFilters;
    const related = toRelatedFilterGroups(relatedGroups);

    setLoading(true);
    setError(null);

    try {
      const saved = await createSavedFilter(
        entity,
        trimmed,
        filters,
        related.length > 0 ? related : undefined,
      );
      await refreshSavedFilters();
      setSelectedSavedFilterId(saved.id);
      setSaveMode(false);
      setSaveName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save filter.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSavedFilterSelect(id: string) {
    setSelectedSavedFilterId(id);
    if (!id) return;

    const saved = savedFilters.find((filter) => filter.id === id);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved.filters);

      let directFilters: FilterItem[] = [];
      let related: RelatedFilterGroup[] = [];

      if (Array.isArray(parsed)) {
        directFilters = parsed as FilterItem[];
      } else if (parsed && typeof parsed === "object") {
        directFilters = parsed.filters ?? [];
        related = parsed.relatedFilters ?? [];
      }

      setRows(toRows(directFilters));

      const restoredGroups: RelatedGroup[] = [];
      for (const rg of related) {
        let relatedFields: FilterableField[] = [];
        try {
          relatedFields = await fetchFilterableFields(rg.entity);
        } catch {
          /* field fetch can fail silently */
        }
        restoredGroups.push({
          id: crypto.randomUUID(),
          entity: rg.entity,
          quantifier: rg.quantifier,
          rows: toRows(rg.filters),
          fields: relatedFields,
          fieldsLoading: false,
        });
      }
      setRelatedGroups(restoredGroups);

      await runSearch(directFilters, related, 1);
    } catch {
      setError("Saved filter could not be parsed.");
    }
  }

  async function handleDeleteSavedFilter(id: string) {
    setLoading(true);
    setError(null);

    try {
      await deleteSavedFilter(id);
      if (selectedSavedFilterId === id) setSelectedSavedFilterId("");
      await refreshSavedFilters();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete filter.",
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Render helpers ──

  function renderFilterRow(
    row: FilterRow,
    availableFields: FilterableField[],
    onFieldChange: (fieldName: string) => void,
    onUpdate: (patch: Partial<FilterRow>) => void,
    onRemove: () => void,
  ) {
    const fMap = new Map(availableFields.map((f) => [f.field, f]));
    const field = fMap.get(row.field);
    const operators = OPERATORS_BY_TYPE[field?.type ?? "text"] ?? [
      { value: "equals", label: "equals" },
    ];

    return (
      <div className={styles.row} key={row.id}>
        <select
          className={styles.select}
          value={row.field}
          onChange={(e) => onFieldChange(e.target.value)}
        >
          <option value="">Select field</option>
          {availableFields.map((f) => (
            <option key={f.field} value={f.field}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          className={styles.select}
          value={row.operator}
          onChange={(e) => onUpdate({ operator: e.target.value })}
          disabled={!row.field}
        >
          {operators.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>

        {field?.type === "select" ? (
          <select
            className={styles.select}
            value={row.value}
            onChange={(e) => onUpdate({ value: e.target.value })}
            disabled={!field}
          >
            <option value="">Select value</option>
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            className={styles.input}
            type={
              field?.type === "number"
                ? "number"
                : field?.type === "date"
                  ? "date"
                  : "text"
            }
            value={row.value}
            onChange={(e) => onUpdate({ value: e.target.value })}
            placeholder="Value"
            disabled={!field}
          />
        )}

        <button
          type="button"
          className={styles.removeButton}
          onClick={onRemove}
          aria-label="Remove filter"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button
            type="button"
            className={`${styles.toggle} ${totalActive > 0 ? styles.toggleActive : ""}`}
            onClick={() => setOpen((v) => !v)}
          >
            <SlidersHorizontal size={13} strokeWidth={2} />
            <span>Filter</span>
            {totalActive > 0 && (
              <span className={styles.badge}>{totalActive}</span>
            )}
            <ChevronDown
              size={13}
              strokeWidth={2}
              className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
            />
          </button>

          {/* Quick-apply saved filter pills */}
          {savedFilters.length > 0 && (
            <div className={styles.presetPills}>
              <span className={styles.presetPillsLabel}>Presets:</span>
              {savedFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={`${styles.presetPill} ${
                    selectedSavedFilterId === filter.id
                      ? styles.presetPillActive
                      : ""
                  }`}
                  onClick={() => handleSavedFilterSelect(filter.id)}
                  disabled={loading}
                >
                  <Bookmark size={11} strokeWidth={2} />
                  <span>{filter.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.toolbarRight}>
          {totalActive > 0 && (
            <span className={styles.activeSummary}>
              {activeFilters.length > 0 &&
                `${activeFilters.length} filter${activeFilters.length !== 1 ? "s" : ""}`}
              {activeFilters.length > 0 && totalRelatedConditions > 0 && ", "}
              {totalRelatedConditions > 0 &&
                `${totalRelatedConditions} related`}
            </span>
          )}

          {(totalActive > 0 || selectedSavedFilterId) && (
            <button
              type="button"
              className={styles.clearAllBtn}
              onClick={handleClear}
              disabled={loading}
              title="Reset all filters"
            >
              <RotateCcw size={12} strokeWidth={2} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Expanded panel ── */}
      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitleWrap}>
              <span className={styles.panelTitle}>Filter Rules</span>
              <span className={styles.panelSubtitle}>
                Apply criteria to narrow down records
              </span>
            </div>
            <button
              type="button"
              className={styles.closePanelBtn}
              onClick={() => setOpen(false)}
              aria-label="Close filters"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>

          {/* Direct filters */}
          <div className={styles.conditionRows}>
            {rows.map((row) =>
              renderFilterRow(
                row,
                fields,
                (fieldName) => handleFieldChange(row, fieldName),
                (patch) => updateRow(row.id, patch),
                () =>
                  setRows((current) =>
                    current.filter((r) => r.id !== row.id),
                  ),
              ),
            )}

            {rows.length === 0 && (
              <div className={styles.emptyHint}>
                No filter rules applied. Click &quot;+ Add condition&quot; to begin.
              </div>
            )}
          </div>

          {/* Related condition groups */}
          {relatedGroups.length > 0 && (
            <div className={styles.relatedSection}>
              <span className={styles.relatedHeading}>
                Cross-table conditions
              </span>

              {relatedGroups.map((group) => (
                <div className={styles.relatedGroup} key={group.id}>
                  <div className={styles.relatedGroupHeader}>
                    <span className={styles.relatedGroupLabel}>Where</span>
                    <select
                      className={styles.select}
                      value={group.quantifier}
                      onChange={(e) =>
                        updateRelatedGroup(group.id, {
                          quantifier: e.target.value as "any" | "none",
                        })
                      }
                    >
                      <option value="any">at least one</option>
                      <option value="none">no</option>
                    </select>
                    <span>related</span>
                    <select
                      className={styles.select}
                      value={group.entity}
                      onChange={(e) =>
                        handleRelatedEntityChange(group.id, e.target.value)
                      }
                    >
                      <option value="">Select table</option>
                      {relationships.map((r) => (
                        <option key={r.entity} value={r.entity}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <span>matches:</span>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removeRelatedGroup(group.id)}
                      aria-label="Remove related group"
                    >
                      <X size={14} strokeWidth={2} />
                    </button>
                  </div>

                  {group.fieldsLoading && (
                    <div className={styles.loadingText}>Loading fields...</div>
                  )}

                  {!group.fieldsLoading && group.entity && (
                    <div className={styles.relatedGroupBody}>
                      {group.rows.map((row) =>
                        renderFilterRow(
                          row,
                          group.fields,
                          (fieldName) =>
                            updateRelatedRow(group.id, row.id, {
                              field: fieldName,
                              operator: "equals",
                              value: "",
                            }),
                          (patch) =>
                            updateRelatedRow(group.id, row.id, patch),
                          () => removeRelatedRow(group.id, row.id),
                        ),
                      )}

                      <button
                        type="button"
                        className={styles.button}
                        onClick={() => addRelatedRow(group.id)}
                      >
                        <Plus size={13} strokeWidth={2} />
                        <span>Add condition</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className={styles.actions}>
            <div className={styles.actionsLeft}>
              <button
                type="button"
                className={`${styles.button} ${styles.outlineButton}`}
                onClick={() =>
                  setRows((current) => [...current, createEmptyRow()])
                }
              >
                <Plus size={13} strokeWidth={2} />
                <span>Add condition</span>
              </button>
              {relationships.length > 0 && (
                <button
                  type="button"
                  className={`${styles.button} ${styles.outlineButton}`}
                  onClick={addRelatedGroup}
                >
                  <Layers size={13} strokeWidth={2} />
                  <span>Related table</span>
                </button>
              )}
            </div>

            <div className={styles.actionsRight}>
              <button
                type="button"
                className={`${styles.button} ${styles.ghostButton}`}
                onClick={handleClear}
                disabled={loading || (rows.length === 0 && relatedGroups.length === 0)}
              >
                Clear
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.primaryButton}`}
                onClick={handleApply}
                disabled={loading || initialising}
              >
                {loading ? "Searching..." : "Apply filters"}
              </button>
            </div>
          </div>

          {/* ── Inline save form ── */}
          <div className={styles.saveBar}>
            {!saveMode ? (
              <button
                type="button"
                className={styles.saveButton}
                onClick={() => setSaveMode(true)}
                disabled={
                  loading ||
                  (activeFilters.length === 0 && totalRelatedConditions === 0)
                }
              >
                <Bookmark size={12} strokeWidth={2} />
                <span>Save current filters as preset</span>
              </button>
            ) : (
              <div className={styles.saveForm}>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Filter preset name"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveConfirm();
                    if (e.key === "Escape") {
                      setSaveMode(false);
                      setSaveName("");
                    }
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className={`${styles.button} ${styles.primaryButton}`}
                  onClick={handleSaveConfirm}
                  disabled={loading || !saveName.trim()}
                >
                  Save
                </button>
                <button
                  type="button"
                  className={`${styles.button} ${styles.ghostButton}`}
                  onClick={() => {
                    setSaveMode(false);
                    setSaveName("");
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Saved filters list */}
          {savedFilters.length > 0 && (
            <div className={styles.presetPills} style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #EBEBE7" }}>
              <span className={styles.presetPillsLabel}>Presets:</span>
              {savedFilters.map((filter) => (
                <div key={filter.id} style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
                  <button
                    type="button"
                    className={`${styles.presetPill} ${
                      selectedSavedFilterId === filter.id ? styles.presetPillActive : ""
                    }`}
                    onClick={() => handleSavedFilterSelect(filter.id)}
                    disabled={loading}
                  >
                    <Bookmark size={11} strokeWidth={2} />
                    <span>{filter.name}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => handleDeleteSavedFilter(filter.id)}
                    disabled={loading}
                    aria-label={`Delete ${filter.name}`}
                    title="Delete preset"
                  >
                    <Trash2 size={12} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}
        </div>
      )}

      {!open && error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
