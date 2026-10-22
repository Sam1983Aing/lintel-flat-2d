# Lists the 1k JPG maps Poly Haven offers for each texture name given on the command line.
import json, sys, urllib.request
for s in sys.argv[1:]:
    req = urllib.request.Request("https://api.polyhaven.com/files/" + s, headers={"User-Agent": "casa-larga-build"})
    d = json.load(urllib.request.urlopen(req))
    out = []
    for m, v in d.items():
        if not isinstance(v, dict):
            continue
        e = v.get("1k", {}).get("jpg")
        if e:
            out.append("%s:%dk" % (m, e["size"] // 1024))
    print(s, "|", " ".join(out))
