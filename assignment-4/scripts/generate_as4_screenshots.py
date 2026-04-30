from __future__ import annotations

import json
from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
from PIL import Image


ASSIGNMENT_ROOT = Path(__file__).resolve().parents[1]

MODULE_A = ASSIGNMENT_ROOT / "Module_A"
MODULE_B = ASSIGNMENT_ROOT / "Module_B"
NB_PATH = MODULE_A / "test_sharding.ipynb"
OUT_DIR = ASSIGNMENT_ROOT / "screenshots" / "as4-ss"
CHART_PATH = MODULE_A / "shard_distribution.png"

SHARD_ROUTER_JS = MODULE_B / "backend" / "src" / "utils" / "shardRouter.js"
SHARD_ROUTER_PY = MODULE_A / "database" / "shard_router.py"
SERVICE_JS = MODULE_B / "backend" / "src" / "services" / "personVisit.service.js"
DOCKER_COMPOSE = ASSIGNMENT_ROOT / "docker-compose.yml"


LIGHT_THEME = {
    "canvas_bg": "#f2f6fc",
    "card_bg": "#fbfdff",
    "card_border": "#c4d4ea",
    "card_shadow": "#8ea3bf",
    "header_bg": "#e3ecf8",
    "header_border": "#c4d4ea",
    "title_text": "#0f2f57",
    "path_text": "#5a6d86",
    "code_bg": "#ffffff",
    "code_border": "#c6d6ec",
    "code_text": "#1f334a",
    "footer_text": "#0f56a6",
    "row_focus": "#2f6faf",
    "row_focus_alpha": 0.12,
    "success_tint": "#2f9e63",
    "success_alpha": 0.12,
    "error_tint": "#d44b4b",
    "error_alpha": 0.13,
    "info_tint": "#2e67aa",
    "info_alpha": 0.11,
    "warn_tint": "#c58a2f",
    "warn_alpha": 0.11,
    "grid_tint": "#2e67aa",
    "grid_alpha": 0.08,
}


def _crop_to_card(out_path: Path, x: float = 0.048, y: float = 0.074, w: float = 0.888, h: float = 0.86) -> None:
    """Crop to the terminal card bounds so no outer margin remains."""
    img = Image.open(out_path).convert("RGB")
    img_w, img_h = img.size

    left = int(round(x * img_w))
    right = int(round((x + w) * img_w))
    top = int(round((1.0 - (y + h)) * img_h))
    bottom = int(round((1.0 - y) * img_h))

    left = max(0, min(left, img_w - 1))
    right = max(left + 1, min(right, img_w))
    top = max(0, min(top, img_h - 1))
    bottom = max(top + 1, min(bottom, img_h))

    cropped = img.crop((left, top, right, bottom))
    cropped.save(out_path)


def _normalize_text(value: object) -> str:
    if isinstance(value, list):
        return "".join(str(part) for part in value)
    return str(value)


def _line_tint(line: str) -> tuple[str | None, float]:
    low = line.lower()
    if "pass" in low or '"passed": true' in low or "ok" in low:
        return LIGHT_THEME["success_tint"], LIGHT_THEME["success_alpha"]
    if "fail" in low or "error" in low or '"passed": false' in low:
        return LIGHT_THEME["error_tint"], LIGHT_THEME["error_alpha"]
    if "results:" in low or "status code" in low:
        return LIGHT_THEME["info_tint"], LIGHT_THEME["info_alpha"]
    if "test " in low and ":" in low:
        return LIGHT_THEME["warn_tint"], LIGHT_THEME["warn_alpha"]
    if line.strip().startswith("+") and line.strip().endswith("+"):
        return LIGHT_THEME["grid_tint"], LIGHT_THEME["grid_alpha"]
    return None, 0.0


def render_frame(
    title: str,
    path_label: str,
    lines: list[str],
    out_path: Path,
    footer: str,
    max_chars: int = 150,
    highlight_rows: set[int] | None = None,
) -> None:
    lines = lines if lines else ["(no content)"]
    n = len(lines)
    highlight_rows = highlight_rows or set()

    # Dynamic sizing: image/card height adapts to line count.
    target_step = 0.024
    if n >= 26:
        target_step = 0.021
    if n >= 38:
        target_step = 0.019

    code_h = 0.06 + max(n, 1) * target_step
    code_h = max(0.22, min(code_h, 0.70))

    card_x, card_w = 0.048, 0.888
    card_top = 0.934
    header_h = 0.078
    gap_header_to_code = 0.034
    gap_code_to_footer = 0.026
    footer_to_bottom = 0.026

    code_x, code_w = 0.072, 0.84
    code_top = card_top - header_h - gap_header_to_code
    code_y = code_top - code_h
    footer_y = code_y - gap_code_to_footer
    card_y = footer_y - footer_to_bottom
    card_h = card_top - card_y
    header_y = card_top - header_h
    header_center_y = header_y + (header_h / 2.0)

    fig = plt.figure(figsize=(16, 9), dpi=150)
    fig.patch.set_facecolor(LIGHT_THEME["canvas_bg"])
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")

    ax.add_patch(
        patches.FancyBboxPatch(
            (card_x + 0.004, card_y - 0.004),
            card_w,
            card_h,
            boxstyle="round,pad=0.012,rounding_size=0.012",
            linewidth=0,
            facecolor=LIGHT_THEME["card_shadow"],
            alpha=0.14,
            zorder=1,
        )
    )

    ax.add_patch(
        patches.FancyBboxPatch(
            (card_x, card_y),
            card_w,
            card_h,
            boxstyle="round,pad=0.012,rounding_size=0.012",
            linewidth=1.0,
            edgecolor=LIGHT_THEME["card_border"],
            facecolor=LIGHT_THEME["card_bg"],
            zorder=2,
        )
    )
    ax.add_patch(
        patches.FancyBboxPatch(
            (card_x, header_y),
            card_w,
            header_h,
            boxstyle="round,pad=0.012,rounding_size=0.012",
            linewidth=0.9,
            edgecolor=LIGHT_THEME["header_border"],
            facecolor=LIGHT_THEME["header_bg"],
            zorder=3,
        )
    )

    ax.scatter(
        [0.079, 0.099, 0.119],
        [header_center_y, header_center_y, header_center_y],
        s=[250, 250, 250],
        c=["#ff5f57", "#febc2e", "#28c840"],
        zorder=4,
    )

    ax.text(
        0.14,
        header_center_y,
        title,
        color=LIGHT_THEME["title_text"],
        fontsize=16,
        fontweight="bold",
        va="center",
        ha="left",
        zorder=4,
    )
    ax.text(
        0.925,
        header_center_y,
        path_label,
        color=LIGHT_THEME["path_text"],
        fontsize=10.5,
        va="center",
        ha="right",
        zorder=4,
    )

    # Code panel
    code_panel = patches.FancyBboxPatch(
        (code_x, code_y),
        code_w,
        code_h,
        boxstyle="round,pad=0.006,rounding_size=0.008",
        linewidth=1.0,
        edgecolor=LIGHT_THEME["code_border"],
        facecolor=LIGHT_THEME["code_bg"],
        zorder=3,
    )
    ax.add_patch(code_panel)

    # Line spacing naturally follows dynamic code panel height.
    line_step = (code_h - 0.06) / max(n, 1)
    first_y = code_y + code_h - 0.04
    font_size = 11.5
    if n >= 20:
        font_size = 10.8
    if n >= 30:
        font_size = 10.0
    if n >= 40:
        font_size = 9.3

    for i, raw in enumerate(lines):
        y = first_y - i * line_step
        line = raw.rstrip("\n")

        tint = None
        alpha = 0.0
        if (i + 1) in highlight_rows:
            tint = LIGHT_THEME["row_focus"]
            alpha = LIGHT_THEME["row_focus_alpha"]
        else:
            tint, alpha = _line_tint(line)

        if tint:
            ax.add_patch(
                patches.FancyBboxPatch(
                    (code_x + 0.008, y - line_step * 0.47),
                    code_w - 0.016,
                    line_step * 0.84,
                    boxstyle="round,pad=0.001,rounding_size=0.003",
                    linewidth=0,
                    facecolor=tint,
                    alpha=alpha,
                    zorder=3.3,
                )
            )

        rendered = f"{i + 1:>2} | {line}"
        if len(rendered) > max_chars:
            rendered = rendered[: max_chars - 3] + "..."

        text = ax.text(
            code_x + 0.015,
            y,
            rendered,
            color=LIGHT_THEME["code_text"],
            fontsize=font_size,
            family="DejaVu Sans Mono",
            va="center",
            ha="left",
            zorder=4,
        )
        text.set_clip_on(True)
        text.set_clip_path(code_panel)

    ax.text(
        0.91,
        footer_y,
        footer,
        color=LIGHT_THEME["footer_text"],
        fontsize=10.5,
        fontweight="bold",
        va="center",
        ha="right",
        zorder=4,
    )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, facecolor=fig.get_facecolor(), dpi=150)
    plt.close(fig)
    _crop_to_card(out_path, x=card_x, y=card_y, w=card_w, h=card_h)


def render_image_frame(
    title: str,
    path_label: str,
    image_path: Path,
    out_path: Path,
    footer: str,
) -> None:
    fig = plt.figure(figsize=(16, 9), dpi=150)
    fig.patch.set_facecolor(LIGHT_THEME["canvas_bg"])
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")

    ax.add_patch(
        patches.FancyBboxPatch(
            (0.052, 0.070),
            0.888,
            0.86,
            boxstyle="round,pad=0.012,rounding_size=0.012",
            linewidth=0,
            facecolor=LIGHT_THEME["card_shadow"],
            alpha=0.14,
            zorder=1,
        )
    )

    ax.add_patch(
        patches.FancyBboxPatch(
            (0.048, 0.074),
            0.888,
            0.86,
            boxstyle="round,pad=0.012,rounding_size=0.012",
            linewidth=1.0,
            edgecolor=LIGHT_THEME["card_border"],
            facecolor=LIGHT_THEME["card_bg"],
            zorder=2,
        )
    )
    ax.add_patch(
        patches.FancyBboxPatch(
            (0.048, 0.855),
            0.888,
            0.078,
            boxstyle="round,pad=0.012,rounding_size=0.012",
            linewidth=0.9,
            edgecolor=LIGHT_THEME["header_border"],
            facecolor=LIGHT_THEME["header_bg"],
            zorder=3,
        )
    )

    ax.scatter(
        [0.079, 0.099, 0.119],
        [0.892, 0.892, 0.892],
        s=[250, 250, 250],
        c=["#ff5f57", "#febc2e", "#28c840"],
        zorder=4,
    )

    ax.text(
        0.14,
        0.892,
        title,
        color=LIGHT_THEME["title_text"],
        fontsize=16,
        fontweight="bold",
        va="center",
        ha="left",
        zorder=4,
    )
    ax.text(
        0.925,
        0.892,
        path_label,
        color=LIGHT_THEME["path_text"],
        fontsize=10.5,
        va="center",
        ha="right",
        zorder=4,
    )

    code_x, code_y = 0.072, 0.12
    code_w, code_h = 0.84, 0.70
    ax.add_patch(
        patches.FancyBboxPatch(
            (code_x, code_y),
            code_w,
            code_h,
            boxstyle="round,pad=0.006,rounding_size=0.008",
            linewidth=1.0,
            edgecolor=LIGHT_THEME["code_border"],
            facecolor=LIGHT_THEME["code_bg"],
            zorder=3,
        )
    )

    image = Image.open(image_path).convert("RGB")
    img_arr = np.array(image)

    image_ax = fig.add_axes([code_x + 0.015, code_y + 0.02, code_w - 0.03, code_h - 0.04])
    image_ax.imshow(img_arr)
    image_ax.axis("off")

    ax.text(
        0.91,
        0.094,
        footer,
        color=LIGHT_THEME["footer_text"],
        fontsize=10.5,
        fontweight="bold",
        va="center",
        ha="right",
        zorder=4,
    )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, facecolor=fig.get_facecolor(), dpi=150)
    plt.close(fig)
    _crop_to_card(out_path)


def quick_bbox_stats(img_path: Path) -> tuple[int, int, float]:
    arr = np.array(Image.open(img_path).convert("RGB"))
    h, w, _ = arr.shape
    bg = arr[0, 0].astype(int)
    diff = np.abs(arr.astype(int) - bg).sum(axis=2)
    ys, xs = np.where(diff > 12)
    if len(xs) == 0:
        return (w, h, 0.0)
    x0, x1 = int(xs.min()), int(xs.max())
    return (w, h, (x1 - x0 + 1) / w)


def load_notebook_outputs(nb_path: Path) -> dict[int, list[str]]:
    nb = json.loads(nb_path.read_text(encoding="utf-8"))
    outputs: dict[int, list[str]] = {}

    code_index = 0
    for cell in nb.get("cells", []):
        if cell.get("cell_type") != "code":
            continue
        code_index += 1

        text_parts: list[str] = []
        for out in cell.get("outputs", []):
            out_type = out.get("output_type")
            if out_type == "stream":
                text_parts.append(_normalize_text(out.get("text", "")))
            elif out_type in ("display_data", "execute_result"):
                data = out.get("data", {})
                if "text/plain" in data:
                    text_parts.append(_normalize_text(data["text/plain"]))
            elif out_type == "error":
                trace = out.get("traceback", [])
                text_parts.append("\n".join(trace))

        text = "".join(text_parts).replace("\r\n", "\n").replace("→", "->")
        lines = [ln for ln in text.split("\n") if ln.strip()]
        outputs[code_index] = lines

    return outputs


def extract_window(
    file_path: Path,
    markers: list[str],
    context_before: int = 6,
    context_after: int = 10,
    use_first_hit: bool = False,
) -> tuple[list[str], set[int]]:
    lines = file_path.read_text(encoding="utf-8").splitlines()
    hits: list[int] = []
    for idx, line in enumerate(lines, start=1):
        if any(marker in line for marker in markers):
            hits.append(idx)

    if not hits:
        end = min(24, len(lines))
        return lines[:end], set()

    if use_first_hit:
        anchor = hits[0]
        start = max(1, anchor - context_before)
        end = min(len(lines), anchor + context_after)
        focus_hits = [anchor]
    else:
        start = max(1, min(hits) - context_before)
        end = min(len(lines), max(hits) + context_after)
        focus_hits = hits

    max_window_lines = 34
    if (end - start + 1) > max_window_lines:
        end = start + max_window_lines - 1
        focus_hits = [h for h in focus_hits if start <= h <= end]

    snippet = lines[start - 1 : end]
    highlight_rows = {line_no - start + 1 for line_no in focus_hits}
    return snippet, highlight_rows


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # These screenshots are not required anymore; remove stale outputs if present.
    for obsolete_name in ("ss_cell4_chart.png", "ss_github_branches.png"):
        obsolete = OUT_DIR / obsolete_name
        if obsolete.exists():
            obsolete.unlink()

    nb_outputs = load_notebook_outputs(NB_PATH)

    cell_specs = {
        1: ("ss_cell1_tables.png", "Cell 1 output: shard tables confirmed"),
        2: ("ss_cell2_counts.png", "Cell 2 output: row-count verification"),
        3: ("ss_cell3_overlap.png", "Cell 3 output: overlap check"),
        5: ("ss_cell5_routing.png", "Cell 5 output: routing table + live lookup"),
        6: ("ss_cell6_insert.png", "Cell 6 output: insert routing proof"),
        7: ("ss_cell7_scatter.png", "Cell 7 output: scatter-gather range query"),
        8: ("ss_cell8_count.png", "Cell 8 output: cross-shard aggregation"),
        9: ("ss_cell9_tradeoffs.png", "Cell 9 output: trade-off analysis"),
    }

    for cell_no, (file_name, title) in cell_specs.items():
        lines = nb_outputs.get(cell_no, ["(missing notebook output for this cell)"])
        max_lines = 32 if cell_no in (2, 7, 9) else 26
        lines = lines[:max_lines]
        render_frame(
            title=title,
            path_label="assignment-4/Module_A/test_sharding.ipynb",
            lines=lines,
            out_path=OUT_DIR / file_name,
            footer=f"Source: notebook output | lines shown: {len(lines)}",
            max_chars=150,
        )

    # Do not generate/overwrite ss_cell4_chart.png.
    # Do not touch ss_bar_chart.png (manual screenshot by user).

    # Code view screenshots (styled frame + highlighted target lines)
    js_lines, js_hl = extract_window(SHARD_ROUTER_JS, ["function getShard(memberId)"])
    render_frame(
        title="shardRouter.js",
        path_label="assignment-4/Module_B/backend/src/utils/shardRouter.js",
        lines=js_lines,
        out_path=OUT_DIR / "ss_shard_router_js.png",
        footer="Highlighted: getShard()",
        max_chars=145,
        highlight_rows=js_hl,
    )

    py_lines, py_hl = extract_window(SHARD_ROUTER_PY, ["def get_shard_id", "def visit_table"])
    render_frame(
        title="shard_router.py",
        path_label="assignment-4/Module_A/database/shard_router.py",
        lines=py_lines,
        out_path=OUT_DIR / "ss_shard_router_py.png",
        footer="Highlighted: get_shard_id() and visit_table()",
        max_chars=145,
        highlight_rows=py_hl,
    )

    svc_lines, svc_hl = extract_window(
        SERVICE_JS,
        ["const shardTable = visitTable(memberId);"],
        context_before=8,
        context_after=14,
        use_first_hit=True,
    )
    render_frame(
        title="personVisit.service.js",
        path_label="assignment-4/Module_B/backend/src/services/personVisit.service.js",
        lines=svc_lines,
        out_path=OUT_DIR / "ss_service_routing.png",
        footer="Highlighted: shard table routing line",
        max_chars=145,
        highlight_rows=svc_hl,
    )

    # Do not touch ss_docker_compose.png (manual screenshot by user).

    generated = sorted(OUT_DIR.glob("ss_*.png"))
    print(f"Generated {len(generated)} screenshot files in {OUT_DIR}")
    for path in generated:
        w, h, ratio = quick_bbox_stats(path)
        print(f"- {path.name}: {w}x{h}, content_width_ratio={ratio:.3f}")


if __name__ == "__main__":
    main()
