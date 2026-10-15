"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, describeError, formatValue, type Dataset, type Distribution } from "../../lib/api";
import { useOnMountLoad } from "../../lib/hooks";
import { BackLink, EmptyBlock, ErrorBlock, LoadingBlock } from "../components/states";
import styles from "../subpage.module.css";

const DISTRIBUTION_DESCRIPTORS = [
  { key: "molecular_weight", title: "Molecular weight distribution", short: "MW" },
  { key: "logp", title: "Crippen LogP distribution (estimate)", short: "LogP" },
  { key: "hbd", title: "Hydrogen-bond donor distribution", short: "HBD" },
  { key: "hba", title: "Hydrogen-bond acceptor distribution", short: "HBA" },
  { key: "tpsa", title: "Topological polar surface area distribution", short: "TPSA" },
];

const CORRELATION_PAIRS = [
  { x: "molecular_weight", y: "logp", label: "Molecular weight vs LogP" },
  { x: "molecular_weight", y: "tpsa", label: "Molecular weight vs TPSA" },
  { x: "logp", y: "tpsa", label: "LogP vs TPSA" },
  { x: "hbd", y: "hba", label: "HBD vs HBA" },
];

interface ScatterData {
  dataset_name: string;
  x_label: string;
  y_label: string;
  x_unit: string;
  y_unit: string;
  record_count: number;
  points: Array<{ id: number; name: string; x: number; y: number }>;
}

export default function AnalyticsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [datasetId, setDatasetId] = useState<string>("");
  const [distributions, setDistributions] = useState<Record<string, Distribution>>({});
  const [scatter, setScatter] = useState<ScatterData | null>(null);
  const [scatterKey, setScatterKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const datasetParam = datasetId ? Number(datasetId) : null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      try {
        const list = await api.datasets();
        setDatasets(list.items);
      } catch {
        setDatasets([]);
      }
      const entries = await Promise.all(
        DISTRIBUTION_DESCRIPTORS.map(async (d) => [
          d.key,
          await api.distribution(d.key, datasetParam),
        ]),
      );
      setDistributions(Object.fromEntries(entries));
      const pair = CORRELATION_PAIRS[scatterKey];
      setScatter(await api.scatter(pair.x, pair.y, datasetParam));
    } catch (err) {
      setError(describeError(err, "Unable to load analytics."));
    } finally {
      setLoading(false);
    }
  }, [datasetParam, scatterKey]);

  useOnMountLoad(load);

  return (
    <div className={styles.container}>
      <BackLink />
      <main id="main-content">
        <h1 className={styles.title}>Property Analytics</h1>
        <p className={styles.subtitle}>
          Interactive distributions and relationships between calculated descriptors. Every chart
          is rendered from live backend data for the selected dataset; records with missing values
          are excluded from a chart and clearly reported in its text summary.
        </p>

        <section className={styles.section} aria-label="Dataset selection">
          <div className={styles.card}>
            <div className={styles.field} style={{ maxWidth: "420px" }}>
              <label htmlFor="analytics-dataset">Dataset</label>
              <select
                id="analytics-dataset"
                value={datasetId}
                onChange={(event) => setDatasetId(event.target.value)}
              >
                <option value="">All datasets</option>
                {datasets.map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.name} ({dataset.record_count})
                  </option>
                ))}
              </select>
            </div>
            <p className={styles.hint} style={{ marginTop: "0.75rem" }}>
              Switching datasets re-queries the backend; all charts below update together.
            </p>
          </div>
        </section>

        {loading && <LoadingBlock label="Building charts from backend data…" />}
        {error && <ErrorBlock message={error} />}

        {!loading && !error && (
          <>
            <section className={styles.section} aria-label="Distributions">
              <h2 className={styles.sectionTitle}>Descriptor distributions</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {DISTRIBUTION_DESCRIPTORS.map((descriptor) => (
                  <DistributionCard
                    key={descriptor.key}
                    title={descriptor.title}
                    data={distributions[descriptor.key]}
                  />
                ))}
              </div>
            </section>

            <section className={styles.section} aria-label="Descriptor relationships">
              <h2 className={styles.sectionTitle}>Descriptor relationships</h2>
              <div className={styles.card}>
                <div className={styles.buttonRow}>
                  {CORRELATION_PAIRS.map((pair, index) => (
                    <button
                      key={pair.label}
                      className={index === scatterKey ? styles.button : styles.secondaryButton}
                      onClick={() => setScatterKey(index)}
                      aria-pressed={index === scatterKey}
                    >
                      {pair.label}
                    </button>
                  ))}
                </div>
                {scatter && scatter.points.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={360}>
                      <ScatterChart margin={{ top: 20, right: 24, bottom: 40, left: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                        <XAxis
                          type="number"
                          dataKey="x"
                          name={scatter.x_label}
                          tick={{ fill: "#94a3b8", fontSize: 11 }}
                          stroke="#475569"
                          label={{
                            value: `${scatter.x_label} (${scatter.x_unit})`,
                            position: "insideBottom",
                            offset: -24,
                            fill: "#cbd5e1",
                            fontSize: 12,
                          }}
                        />
                        <YAxis
                          type="number"
                          dataKey="y"
                          name={scatter.y_label}
                          tick={{ fill: "#94a3b8", fontSize: 11 }}
                          stroke="#475569"
                          label={{
                            value: `${scatter.y_label} (${scatter.y_unit})`,
                            angle: -90,
                            position: "insideLeft",
                            fill: "#cbd5e1",
                            fontSize: 12,
                          }}
                        />
                        <Tooltip content={<ScatterTooltip xUnit={scatter.x_unit} yUnit={scatter.y_unit} xLabel={scatter.x_label} yLabel={scatter.y_label} />} />
                        <Scatter data={scatter.points} fill="#22d3ee" fillOpacity={0.75} />
                      </ScatterChart>
                    </ResponsiveContainer>
                    <p className={styles.summary}>
                      <strong>{scatter.dataset_name}</strong> — {scatter.points.length} of{" "}
                      {scatter.record_count} records plotted (records missing either value are
                      excluded, never plotted as zero). Each point is one molecule; tooltips show
                      its name and both descriptor values.
                    </p>
                  </>
                ) : (
                  <EmptyBlock title="No paired data available for these descriptors.">
                    A relationship requires records where both descriptors are present.
                  </EmptyBlock>
                )}
              </div>
            </section>

            <section className={styles.section}>
              <p className={styles.summary}>
                These charts describe calculated descriptor relationships only. Patterns here do
                not establish biological activity, efficacy, safety, or toxicity for any molecule.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Distribution card
 * -------------------------------------------------------------------------- */

function DistributionCard({
  title,
  data,
}: {
  title: string;
  data?: Distribution;
}) {
  const bins = useMemo(
    () =>
      (data?.bins || []).map((bin, index) => ({
        ...bin,
        label: `${formatValue(bin.start, 2)}–${formatValue(bin.end, 2)}`,
        index,
      })),
    [data],
  );

  if (!data) return null;

  if (data.included_count === 0) {
    return (
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>{title}</h3>
        <EmptyBlock title="No data to chart for this selection.">
          <span className={styles.hint}>
            Dataset: {data.dataset_name} · 0 of {data.record_count} records included ·{" "}
            {data.unit}
          </span>
        </EmptyBlock>
      </div>
    );
  }

  return (
    <div className={styles.chartCard}>
      <h3 className={styles.chartTitle}>{title}</h3>
      <p className={styles.hint}>
        {data.dataset_name} · {data.included_count} of {data.record_count} records · unit{" "}
        {data.unit}
        {data.missing_count > 0 ? ` · ${data.missing_count} records missing a value (excluded)` : ""}
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={bins} margin={{ top: 16, right: 16, bottom: 36, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            angle={-35}
            textAnchor="end"
            height={60}
            stroke="#475569"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            stroke="#475569"
            label={{
              value: "molecules",
              angle: -90,
              position: "insideLeft",
              fill: "#cbd5e1",
              fontSize: 12,
            }}
          />
          <Tooltip content={<BarTooltip unit={data.unit} />} />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {bins.map((bin) => (
              <Cell key={bin.index} fill="#0ea5e9" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className={styles.summary}>
        Text summary: {data.included_count} molecules included
        {data.missing_count > 0 ? `, ${data.missing_count} excluded as missing` : ""}; range{" "}
        {formatValue(data.min, 3)} to {formatValue(data.max, 3)} {data.unit}; median{" "}
        {formatValue(data.median, 3)}; mean {formatValue(data.mean, 3)}. Bars show how many
        molecules fall in each value bin across {data.bins.length} bins.
      </p>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Tooltips
 * -------------------------------------------------------------------------- */

function BarTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; count: number } }>;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipRow}>
        <span>Range</span>
        <strong>
          {datum.label} {unit}
        </strong>
      </div>
      <div className={styles.tooltipRow}>
        <span>Molecules</span>
        <strong>{datum.count}</strong>
      </div>
    </div>
  );
}

function ScatterTooltip({
  active,
  payload,
  xLabel,
  yLabel,
  xUnit,
  yUnit,
}: {
  active?: boolean;
  payload?: Array<{ payload: { name: string; x: number; y: number } }>;
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
}) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{datum.name}</div>
      <div className={styles.tooltipRow}>
        <span>{xLabel}</span>
        <strong>
          {formatValue(datum.x, 3)} {xUnit}
        </strong>
      </div>
      <div className={styles.tooltipRow}>
        <span>{yLabel}</span>
        <strong>
          {formatValue(datum.y, 3)} {yUnit}
        </strong>
      </div>
    </div>
  );
}
