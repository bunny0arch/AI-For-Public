# GetLayers Interaction Study

The reviewed GetLayers library uses a dark, low-distraction shell and lets a single high-impact visual carry each example. Its strongest transferable pattern is **discipline**: compact navigation, a concise statement of intent, a single prominent object, then a searchable content index. The implementation will retain that hierarchy but translate it into a public-good context rather than copy its art direction or source material.

For **Tidal Signal**, the adopted decisions are a restrained dark masthead, a full-bleed cinematic hero with one clear action, and a rich-but-lightweight pathway index. Rather than GPU-heavy 3D scenes or cursor-tracked effects, the site will use resource-conscious CSS transforms, short entry transitions, and a single video layer. The interactive focus will be a conversation dock that opens from a chosen community pathway, preserving context and giving each route a clear next step.

The resulting performance contract is: preload only the video metadata, use a static poster/gradient fallback on reduced-motion or narrow connections, defer below-the-fold imagery with `loading="lazy"`, keep visual effects to composited opacity/transforms, and avoid unnecessary external API calls or application connectors that would add latency without improving this frontend experience.

## MotionSites Study

MotionSites reinforces a second useful principle: **animation needs a stage**. Its examples lead with a concise full-width statement, then arrange motion samples in a clear catalogue. For Tidal Signal, that informs the visual rhythm rather than the visual style. The immersive video will stay concentrated in the opening stage; afterward, the community routes will shift into a high-clarity editorial index instead of continuously animated tiles.

The implementation will borrow three performance-safe ideas: a tightly cropped hero statement with a small overline, staggered card/index arrival that is limited to opacity and vertical transform, and hover feedback that changes only a line, number position, and border contrast. It will not import MotionSites assets, source code, glowing treatment, or high-cost effects. The user’s provided video and our generated documentary assets remain the site’s own visual world.
