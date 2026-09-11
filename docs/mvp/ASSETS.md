# MVP asset contract

The companion registry lives in `src/app/companions.js`. Every registry ID must have one matching folder under `public/assets/bots/` with these two files:

```text
public/assets/bots/<id>/portrait.png
public/assets/bots/<id>/bust.png
```

Current IDs and display names:

| ID | Name | Asset folder | Accent |
| --- | --- | --- | --- |
| `rivet` | Rivet | `rivet` | `#79d8ef` |
| `nova` | Nova | `nova` | `#f59abf` |
| `sterling` | Sterling | `sterling` | `#75a9e8` |
| `pixel` | Pixel | `pixel` | `#b8f542` |
| `luma` | Luma | `luma` | `#64dfff` |

The current artwork is usable for the MVP. Portraits are square and the renderer scales them to the widget; Luma’s portrait is higher resolution than the others but does not require recreation. Busts are transparent PNGs and are layered behind the animated portrait.

Local runtime models are separate from companion artwork and remain in the ignored `models/` directory. Their names and roles are documented in [`models/README.md`](../../models/README.md).
