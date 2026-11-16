# Audio

**No background music — by design.** The user explicitly approved a silent video.

The final MP4 contains a silent AAC track (muxed by `editing_scripts/build_video.cjs`)
so players and projection systems treat the file as a normal video with audio.

If a narration or music track is ever wanted, re-run the build script and add an
extra audio input to the final mux step.
