"""
Draws the report figures from docs/week06/data/generations.csv (written by ExperimentRunner)
and saves a summary table to docs/week06/data/summary.json.

  python tools/plot_experiments.py
"""
import csv
import json
import statistics as st
from collections import defaultdict
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

DATA = Path("docs/week06/data/generations.csv")
OUT = Path("docs/week06/images")
OUT.mkdir(parents=True, exist_ok=True)

COLORS = {
    "bright": "#2a6fdb", "dull": "#e07b00", "random": "#7a7a7a", "noselection": "#b04aa6",
    "mut0.00": "#d1495b", "mut0.02": "#2a6fdb", "mut0.10": "#1a9e5c", "mut0.50": "#e07b00",
    "size_color": "#2a6fdb", "size_visible": "#d1495b",
}
FIELDS = ["mean_L", "std_L", "mean_r", "mean_g", "mean_b", "mean_s"]


def load():
    rows = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))  # cond -> field -> gen -> [values per seed]
    labels = {}
    for r in csv.DictReader(DATA.open(encoding="utf-8")):
        labels[r["condition"]] = r["label"]
        for f in FIELDS:
            rows[r["condition"]][f][int(r["generation"])].append(float(r[f]))
    return rows, labels


def series(rows, cond, field):
    gens = sorted(rows[cond][field])
    values = np.array([rows[cond][field][g] for g in gens])  # generations x seeds
    return np.array(gens), values.mean(axis=1), values.std(axis=1)


def band(ax, rows, labels, cond, field, label=None):
    g, m, s = series(rows, cond, field)
    ax.plot(g, m, color=COLORS[cond], lw=2, label=label or labels[cond])
    ax.fill_between(g, np.maximum(m - s, 0), m + s, color=COLORS[cond], alpha=0.15)


def main():
    rows, labels = load()
    n_seeds = len(next(iter(rows["bright"]["mean_L"].values())))

    # 1. Hunter rule (slides 35-36)
    fig, ax = plt.subplots(figsize=(10, 5))
    for c in ["bright", "dull", "random", "noselection"]:
        band(ax, rows, labels, c, "mean_L")
    ax.set_xlabel("Nesil")
    ax.set_ylabel("Ortalama parlaklık L")
    ax.set_ylim(0, 1)
    ax.set_title(f"Avcı kuralı renk evrimini nasıl yönlendiriyor? ({n_seeds} seed, çizgi: ortalama, gölge: ±1 std)")
    ax.grid(alpha=0.3)
    ax.legend(loc="center right")
    fig.tight_layout()
    fig.savefig(OUT / "hunter_rules.png", dpi=140)
    plt.close(fig)

    # 2. Mutation rates (homework): brightness and diversity
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(14, 5))
    for c in ["mut0.00", "mut0.02", "mut0.10", "mut0.50"]:
        band(a1, rows, labels, c, "mean_L")
        band(a2, rows, labels, c, "std_L")
    a1.set_title("Ortalama parlaklık L (parlak avcı)")
    a1.set_ylim(0, 0.7)
    a2.set_title("Popülasyon içi çeşitlilik (L'nin standart sapması)")
    for a in (a1, a2):
        a.set_xlabel("Nesil")
        a.grid(alpha=0.3)
    a1.set_ylabel("L")
    a2.set_ylabel("std(L)")
    a1.legend()
    fig.suptitle("Ev ödevi: aynı başlangıç koşullarında farklı mutasyon oranları")
    fig.tight_layout()
    fig.savefig(OUT / "mutation_rates.png", dpi=140)
    plt.close(fig)

    # 3. Size gene (challenge)
    fig, ax = plt.subplots(figsize=(10, 5))
    for c in ["size_color", "size_visible"]:
        band(ax, rows, labels, c, "mean_s")
    ax.axhline(1.0, color="#999", ls="--", lw=1, label="Başlangıç ortalaması (1.0)")
    ax.set_xlabel("Nesil")
    ax.set_ylabel("Ortalama boyut geni s")
    ax.set_ylim(0.4, 1.6)
    ax.set_title("Challenge: boyut geni yalnızca boyut seçilimi varken yönlü evrilir")
    ax.grid(alpha=0.3)
    ax.legend()
    fig.tight_layout()
    fig.savefig(OUT / "size_gene.png", dpi=140)
    plt.close(fig)

    # 4. Which colour channel changes? (bright hunter)
    fig, ax = plt.subplots(figsize=(10, 4.5))
    for field, color, name in [("mean_r", "#d1495b", "r (L'deki ağırlık 0.2126)"),
                               ("mean_g", "#1a9e5c", "g (L'deki ağırlık 0.7152)"),
                               ("mean_b", "#2a6fdb", "b (L'deki ağırlık 0.0722)")]:
        g, m, s = series(rows, "bright", field)
        ax.plot(g, m, color=color, lw=2, label=name)
        ax.fill_between(g, m - s, m + s, color=color, alpha=0.12)
    ax.set_xlabel("Nesil")
    ax.set_ylabel("Ortalama gen değeri")
    ax.set_ylim(0, 1)
    ax.set_title("Parlak avcıda hangi renk kanalı en çok değişiyor?")
    ax.grid(alpha=0.3)
    ax.legend()
    fig.tight_layout()
    fig.savefig(OUT / "rgb_channels.png", dpi=140)
    plt.close(fig)

    # Summary table (mean ± std over seeds)
    summary = {"seeds": n_seeds, "conditions": {}}
    for c in rows:
        entry = {"label": labels[c]}
        for gen in (1, 10, 20, 40):
            for f in FIELDS:
                v = rows[c][f][gen]
                entry[f"{f}_g{gen}"] = [round(st.mean(v), 4), round(st.stdev(v), 4)]
        summary["conditions"][c] = entry
    (DATA.parent / "summary.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False), encoding="utf-8")
    print("figures ->", OUT)


if __name__ == "__main__":
    main()
