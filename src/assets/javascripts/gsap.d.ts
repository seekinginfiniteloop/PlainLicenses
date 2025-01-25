import { gsap } from "gsap";

declare module "gsap" {

  export interface GSAP extends gsap {
    animateMessage(targets: gsap.TweenTarget, config: AnimateMessageConfig): gsap.core.Timeline;
    fadeIn(targets: gsap.TweenTarget, config: FadeEffectConfig) => gsap.core.Timeline;
    fadeOut(targets: gsap.TweenTarget, config: FadeEffectConfig) => gsap.core.Timeline;
    emphasize(targets: gsap.TweenTarget, config: EmphasisConfig) => gsap.core.Timeline;
    setSection(config: TransitionConfig): gsap.core.Timeline;
    transitionSection(config: TransitionConfig): gsap.core.Timeline;
  }

  const gsap: GSAP;
}
