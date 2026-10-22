# Downloads CC0 texture maps from Poly Haven.
# usage: python3 ph_get.py <resolution> <dest_dir> <name>:<Map>,<Map> [<name>:<Map> ...]
#   e.g. python3 ph_get.py 2k assets/textures marble_01:Diffuse,nor_gl,Rough
import json, os, sys, urllib.request
res, dest = sys.argv[1], sys.argv[2]
os.makedirs(dest, exist_ok=True)
UA = {"User-Agent": "casa-larga-build"}
for spec in sys.argv[3:]:
    slug, maps = spec.split(":")
    d = json.load(urllib.request.urlopen(urllib.request.Request("https://api.polyhaven.com/files/" + slug, headers=UA)))
    for m in maps.split(","):
        e = d[m][res]["jpg"]
        name = os.path.basename(e["url"])
        path = os.path.join(dest, name)
        data = urllib.request.urlopen(urllib.request.Request(e["url"], headers=UA)).read()
        with open(path, "wb") as f:
            f.write(data)
        print("%-44s %7d bytes  %s" % (name, len(data), e["url"]))
