# lior-and-adina-wedding

Open `index.html` directly or serve this directory to preview the site.
Deploy the directory including `parachuters.bundle.js`.

The checked-in bundle includes Three.js and supports local `file://` previews.
After editing `parachuters.js`, regenerate it with:

```sh
npx --yes esbuild@0.25.12 parachuters.js --bundle --format=iife --minify --outfile=parachuters.bundle.js
```

Three.js licensing is included in `vendor/three.LICENSE` and the generated bundle.
