import { useEffect } from 'react'

// Marks a scroller with data-more-below (and, with `top`, data-more-above) while there is
// content past that edge, for the .scroll-edges fade in index.css. Content can grow without
// a scroll event (a streaming answer, a card lighting up, a list opening), so size changes
// re-measure too.
export function useScrollEdges(ref, { top = false, enabled = true } = {}) {
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    let raf = 0
    const measure = () => {
      raf = 0
      el.toggleAttribute('data-more-below', el.scrollHeight - el.clientHeight - el.scrollTop > 1)
      if (top) el.toggleAttribute('data-more-above', el.scrollTop > 1)
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    const sizes = new ResizeObserver(schedule)
    const watch = () => {
      sizes.disconnect()
      sizes.observe(el)
      for (const child of el.children) sizes.observe(child)
    }
    const children = new MutationObserver(() => {
      watch()
      schedule()
    })
    watch()
    children.observe(el, { childList: true })
    el.addEventListener('scroll', schedule, { passive: true })
    measure()
    return () => {
      el.removeEventListener('scroll', schedule)
      sizes.disconnect()
      children.disconnect()
      cancelAnimationFrame(raf)
      el.removeAttribute('data-more-below')
      el.removeAttribute('data-more-above')
    }
  }, [ref, top, enabled])
}
