"""Fetch the CC0 photo materials and skies used by the three concept pages.

All assets come from Poly Haven (https://polyhaven.com, CC0, no attribution
required). Textures are saved at 2k as JPG (colour, OpenGL normal, and the
packed AO/roughness/metal map). Skies are saved twice: a 1k .hdr for lighting
and a 4096x2048 tonemapped JPG for the visible background.

Run from the project folder:  python3 tools/fetch_assets.py
Needs curl and ffmpeg on PATH. Re-running skips files that already exist.
"""
import json, os, subprocess, sys, urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")

TEXTURES = {
    # 01 Lintel (architecture)
    "wood_textured_concrete": "2k", "marble_01": "2k", "black_painted_planks": "2k",
    "oak_wood_planks": "2k", "gravel_floor_02": "2k", "rock_boulder_dry": "2k", "withered_grass": "2k",
    # 02 Diorama (museum)
    "snow_02": "2k", "snow_03": "2k", "pine_bark": "2k", "rosewood_veneer1": "2k", "old_wood_floor": "2k",
    "lichen_rock": "2k",
    # 03 Postcard (Cyclades hotel)
    "white_stucco": "2k", "white_rough_plaster": "2k", "blue_painted_planks": "2k", "terracotta_floor_tiles": "2k",
    "old_stone_wall": "2k", "long_white_tiles": "2k", "reed_roof_03": "2k", "wood_table_worn": "2k",
    "rocks_ground_02": "2k",
    # 04 The Last Keeper (lighthouse)
    "roof_slates_03": "2k", "weathered_planks": "2k", "dark_wooden_planks": "2k", "gray_rocks": "2k",
    "coast_sand_01": "2k", "dark_rock": "2k", "sparse_grass": "2k", "painted_plaster_wall": "2k",
    "plastered_stone_wall": "2k", "rock_wall_02": "2k", "plastered_wall_04": "2k",
    # 05 The Floating World (the old coast road)
    "clay_plaster": "2k", "grey_roof_tiles": "2k", "dirt_floor": "2k", "bamboo_wall": "2k", "mossy_rock": "2k",
    # 06 The Night Train (sleeper in the snow)
    "leather_red_02": "2k", "poly_wool_herringbone": "2k", "rough_linen": "2k", "natural_walnut_veneer": "2k",
    "rustic_stone_wall": "2k", "dirty_carpet": "2k",
    # 03 Hotel Kyma iteration 2 (the caldera at Oia)
    "cliff_side": "2k", "dark_rock_02": "2k", "rock_boulder_cracked": "2k", "rough_concrete": "2k",
}
SKIES = ["qwantani_late_afternoon_puresky", "kloofendal_43d_clear_puresky", "winter_evening", "kloofendal_38d_partly_cloudy_puresky", "belfast_sunset_puresky",
         "qwantani_sunset_puresky", "qwantani_moonrise_puresky", "qwantani_dusk_2_puresky", "qwantani_dawn_puresky"]
MAPS = {"Diffuse": "diff", "nor_gl": "nor", "arm": "arm"}


def api(path):
    req = urllib.request.Request("https://api.polyhaven.com/" + path, headers={"User-Agent": "flat3d-asset-fetch/1.0"})
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def fetch(url, dest, reencode=None):
    if os.path.exists(dest):
        return
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    tmp = dest + ".part"
    subprocess.run(["curl", "-sL", "-A", "flat3d-asset-fetch/1.0", "-o", tmp, url], check=True)
    if reencode:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp] + reencode + [dest], check=True)
        os.remove(tmp)
    else:
        os.replace(tmp, dest)
    print("  ", os.path.relpath(dest, ROOT), round(os.path.getsize(dest) / 1e6, 2), "MB")


def main():
    meta = {}
    for tid, res in TEXTURES.items():
        print(tid)
        files = api("files/" + tid)
        info = api("info/" + tid)
        meta[tid] = {"dimensions_mm": info.get("dimensions"), "name": info.get("name")}
        for key, short in MAPS.items():
            if key == "Diffuse" and key not in files:
                key = "coll1"                                   # some fabrics ship colour variants instead
            url = files[key][res]["jpg"]["url"]
            fetch(url, os.path.join(ROOT, "tex", tid, short + ".jpg"), ["-q:v", "3"])
    for sid in SKIES:
        print(sid)
        files = api("files/" + sid)
        fetch(files["hdri"]["1k"]["hdr"]["url"], os.path.join(ROOT, "sky", sid + "_1k.hdr"))
        fetch(files["tonemapped"]["url"], os.path.join(ROOT, "sky", sid + ".jpg"),
              ["-vf", "scale=4096:2048", "-q:v", "3"])
    with open(os.path.join(ROOT, "tex", "meta.json"), "w") as f:
        json.dump(meta, f, indent=1)
    print("done")


if __name__ == "__main__":
    sys.exit(main())
