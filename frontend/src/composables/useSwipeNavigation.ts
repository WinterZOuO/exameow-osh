import { ref } from 'vue'

export interface SwipeNavOptions {
  threshold?: number
}

function isInteractiveEl(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return target.closest('button, input, textarea, select, a') !== null
}

export function useSwipeNavigation(
  onNavigate: (dir: 'next' | 'prev') => void,
  onCommit: (direction: 'next' | 'prev', offset: number, width: number) => void,
  options: SwipeNavOptions = {},
) {
  const { threshold = 60 } = options

  const slideOffset = ref(0)
  const animating = ref(false)

  let isDragging = false
  let startX = 0
  let startY = 0
  let elWidth = 0

  function commit(direction: 'next' | 'prev', offset: number) {
    if (animating.value) return
    animating.value = true
    onCommit(direction, offset, elWidth)
  }

  // ── Keyboard ──
  function handleKeydown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return
    if (animating.value) return

    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      onNavigate('prev')
      commit('prev', 0)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      onNavigate('next')
      commit('next', 0)
    }
  }

  // ── Touch ──
  function handleTouchStart(e: TouchEvent) {
    if (animating.value || isInteractiveEl(e.target) || e.touches.length !== 1) return
    startX = e.touches[0]!.clientX
    startY = e.touches[0]!.clientY
    isDragging = true
    slideOffset.value = 0
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isDragging || e.touches.length !== 1) return
    const totalDx = e.touches[0]!.clientX - startX
    const totalDy = Math.abs(e.touches[0]!.clientY - startY)
    if (Math.abs(totalDx) > Math.abs(totalDy) && Math.abs(totalDx) > 10) {
      e.preventDefault()
    }
    slideOffset.value = totalDx
  }

  function handleTouchEnd(e: TouchEvent) {
    if (!isDragging) return
    isDragging = false
    const totalDx = (e.changedTouches[0]?.clientX ?? startX) - startX
    const totalDy = Math.abs((e.changedTouches[0]?.clientY ?? startY) - startY)

    if (Math.abs(totalDx) > threshold && Math.abs(totalDx) > totalDy) {
      if (totalDx < 0) {
        onNavigate('next')
        commit('next', totalDx)
      } else {
        onNavigate('prev')
        commit('prev', totalDx)
      }
    } else {
      slideOffset.value = 0
    }
  }

  // ── Mouse drag ──
  function handleMouseDown(e: MouseEvent) {
    if (animating.value || isInteractiveEl(e.target)) return
    startX = e.clientX
    startY = e.clientY
    isDragging = true
    slideOffset.value = 0
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return
    slideOffset.value = e.clientX - startX
  }

  function handleMouseUp(e: MouseEvent) {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    if (!isDragging) return
    isDragging = false
    const totalDx = e.clientX - startX
    const totalDy = Math.abs(e.clientY - startY)

    if (Math.abs(totalDx) > threshold && Math.abs(totalDx) > totalDy) {
      if (totalDx < 0) {
        onNavigate('next')
        commit('next', totalDx)
      } else {
        onNavigate('prev')
        commit('prev', totalDx)
      }
    } else {
      slideOffset.value = 0
    }
  }

  // ── Attach / Detach ──
  function attach(el: HTMLElement) {
    elWidth = el.offsetWidth
    window.addEventListener('keydown', handleKeydown)
    el.addEventListener('touchstart', handleTouchStart, { passive: false })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd)
    el.addEventListener('mousedown', handleMouseDown)
  }

  function detach(el: HTMLElement) {
    window.removeEventListener('keydown', handleKeydown)
    el.removeEventListener('touchstart', handleTouchStart)
    el.removeEventListener('touchmove', handleTouchMove)
    el.removeEventListener('touchend', handleTouchEnd)
    el.removeEventListener('mousedown', handleMouseDown)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    isDragging = false
    slideOffset.value = 0
  }

  function finishAnimation() {
    animating.value = false
    slideOffset.value = 0
  }

  return {
    slideOffset,
    animating,
    triggerSlide: commit,
    finishAnimation,
    attach,
    detach,
  }
}
