/*=============== HOME: ANIMATED "DATA SCIENCE & ML" ===============*/
/* Буквы по очереди выезжают снизу, держатся 4 секунды и уезжают вверх (как на сайте-шаблоне).
   Написано без сторонних библиотек: ничего не нужно подключать и нечему ломаться. */
const IN_MS = 900,
      HOLD_MS = 4000,
      OUT_MS = 900,
      TOTAL_MS = IN_MS + HOLD_MS + OUT_MS,
      STAGGER_MS = 80

const animateProfession = (selector) => {
  const el = document.querySelector(selector)
  if (!el || !el.animate) return

  const textValue = el.textContent.trim()
  el.textContent = ''
  el.setAttribute('aria-label', textValue)
  el.style.whiteSpace = 'nowrap'

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  ;[...textValue].forEach((char, index) => {
    const span = document.createElement('span')
    span.textContent = char
    span.setAttribute('aria-hidden', 'true')
    span.style.display = 'inline-block'
    span.style.whiteSpace = 'pre'
    el.appendChild(span)

    if (reduceMotion) return

    span.animate([
      { transform: 'translateY(100%)', offset: 0, easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)' },
      { transform: 'translateY(0)', offset: IN_MS / TOTAL_MS, easing: 'linear' },
      { transform: 'translateY(0)', offset: (IN_MS + HOLD_MS) / TOTAL_MS, easing: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)' },
      { transform: 'translateY(-100%)', offset: 1 }
    ], {
      duration: TOTAL_MS,
      delay: index * STAGGER_MS,
      iterations: Infinity,
      fill: 'both'
    })
  })
}

animateProfession('.home__profession-1')
animateProfession('.home__profession-2')


/*=============== SWIPER PROJECTS ===============*/
const projectsSwiper = document.querySelector('.projects__swiper')

if (projectsSwiper && typeof Swiper !== 'undefined') {
  const projectSlides = projectsSwiper.querySelectorAll('.swiper-slide').length,
        hasManyProjects = projectSlides > 1

  new Swiper('.projects__swiper', {
    // loop и autoplay имеют смысл только если проектов два и больше
    loop: hasManyProjects,
    // проект стоит по центру
    centeredSlides: true,
    spaceBetween: hasManyProjects ? 24 : 0,
    slidesPerView: 'auto',
    grabCursor: hasManyProjects,
    speed: 600,

    pagination: {
      el: '.swiper-pagination',
      clickable: true,
    },

    autoplay: hasManyProjects ? {
      delay: 3000,
      disableOnInteraction: false,
    } : false,
  })

  // пока проект один, точка пагинации не нужна
  if (!hasManyProjects) {
    const pagination = projectsSwiper.querySelector('.swiper-pagination')
    if (pagination) pagination.style.display = 'none'
  }
}


/*=============== COPY EMAIL IN CONTACT ===============*/
const copyBtn = document.getElementById('contact-btn')

if (copyBtn) {
  const email = copyBtn.dataset.email,
        label = copyBtn.querySelector('.contact__label'),
        icon = copyBtn.querySelector('.contact__copy-icon'),
        originalText = label.textContent
  let resetTimer

  // запасной способ копирования, если clipboard API недоступен
  const fallbackCopy = (value) => {
    const area = document.createElement('textarea')
    area.value = value
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()

    let ok = false
    try { ok = document.execCommand('copy') } catch (e) { ok = false }
    document.body.removeChild(area)
    return ok
  }

  copyBtn.addEventListener('click', async () => {
    let copied = false

    try {
      await navigator.clipboard.writeText(email)
      copied = true
    } catch (e) {
      copied = fallbackCopy(email)
    }

    // если скопировать не удалось, просто открываем почтовую программу
    if (!copied) {
      window.location.href = 'mailto:' + email
      return
    }

    label.textContent = 'Почта скопирована'
    if (icon) icon.className = 'ri-check-line contact__copy-icon'

    clearTimeout(resetTimer)
    resetTimer = setTimeout(() => {
      label.textContent = originalText
      if (icon) icon.className = 'ri-file-copy-line contact__copy-icon'
    }, 2000)
  })
}


/*=============== CURRENT YEAR OF THE FOOTER ===============*/
const textYear = document.getElementById('footer-year')

if (textYear) {
  textYear.textContent = new Date().getFullYear()
}


/*=============== SCROLL SECTIONS ACTIVE LINK ===============*/
const sections = document.querySelectorAll('section[id]')

const scrollActive = () => {
  const scrollY = window.scrollY

  sections.forEach(section => {
    const id = section.id,
          top = section.offsetTop - 50,
          height = section.offsetHeight,
          link = document.querySelector('.nav__menu a[href*="' + id + '"]')

    if (!link) return
    link.classList.toggle('active-link', scrollY > top && scrollY <= top + height)
  })
}

window.addEventListener('scroll', scrollActive)


/*=============== ABOUT: ISOLATION FOREST ANIMATION ===============*/
/* Небольшая анимация про мой проект: алгоритм Isolation Forest случайными "разрезами"
   отделяет редкие аномальные точки (как мошеннические транзакции) от основной массы.
   Аномалии изолируются за несколько разрезов, обычные точки требуют гораздо больше. */
;(() => {
  const canvas = document.getElementById('iforest-canvas'),
        caption = document.getElementById('iforest-caption')

  if (!canvas || !canvas.getContext) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        N_NORMAL = 140,
        N_ANOMALY = 4,
        PAD = 14,
        START = 1.0,        // секунд на появление точек
        DRAW_FRAC = 0.75,   // доля времени уровня, за которую рисуются линии
        HOLD = 2.8,         // пауза с итогом
        FADE_OUT = 0.8,
        COLOR_LINE = '135, 108, 219',
        COLOR_POINT = '222, 222, 240',
        COLOR_ANOMALY = '255, 138, 216'

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v)),
        easeOut = (p) => 1 - Math.pow(1 - p, 3),
        fmt = (n) => n.toFixed(1).replace('.', ','),
        levelDuration = (l) => (l < 4 ? 0.7 : l < 8 ? 0.38 : 0.2)

  const gauss = () => {
    let u = 0, v = 0
    while (!u) u = Math.random()
    while (!v) v = Math.random()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }

  const centers = [
    { x: 0.36, y: 0.56, s: 0.085 },
    { x: 0.60, y: 0.44, s: 0.075 }
  ]

  // Данные: два плотных "облака" обычных точек и несколько далёких аномалий
  const makePoints = () => {
    const list = []

    for (let i = 0; i < N_NORMAL; i++) {
      const c = centers[i % 2]
      list.push({
        x: clamp(c.x + gauss() * c.s, 0.08, 0.92),
        y: clamp(c.y + gauss() * c.s, 0.08, 0.92),
        out: false
      })
    }

    let found = 0, guard = 0
    while (found < N_ANOMALY && guard++ < 800) {
      const x = 0.06 + Math.random() * 0.88,
            y = 0.06 + Math.random() * 0.88,
            farFromClusters = centers.every(c => Math.hypot(x - c.x, y - c.y) > 0.3),
            apart = list.filter(p => p.out).every(p => Math.hypot(x - p.x, y - p.y) > 0.22)

      if (farFromClusters && apart) {
        list.push({ x, y, out: true })
        found++
      }
    }

    return list
  }

  // Один дерево изоляции: на каждом уровне каждая область режется случайной линией
  const buildTree = (list) => {
    const levels = [],
          depthOf = new Array(list.length).fill(0)
    let nodes = [{ idx: list.map((_, i) => i), x0: 0, y0: 0, x1: 1, y1: 1 }],
        level = 0

    while (nodes.length && level < 24) {
      const segs = [], iso = [], next = []

      nodes.forEach(n => {
        if (n.idx.length <= 1) return

        let dim = Math.random() < 0.5 ? 'x' : 'y'
        const range = (d) => {
          let lo = Infinity, hi = -Infinity
          n.idx.forEach(i => { lo = Math.min(lo, list[i][d]); hi = Math.max(hi, list[i][d]) })
          return [lo, hi]
        }

        let [lo, hi] = range(dim)
        if (hi - lo < 1e-6) {
          dim = dim === 'x' ? 'y' : 'x';
          [lo, hi] = range(dim)
        }
        if (hi - lo < 1e-6) {
          n.idx.forEach(i => { depthOf[i] = level + 1 })
          return
        }

        const v = lo + (hi - lo) * (0.02 + Math.random() * 0.96),
              a = n.idx.filter(i => list[i][dim] < v),
              b = n.idx.filter(i => list[i][dim] >= v)
        let rectA, rectB

        if (dim === 'x') {
          segs.push({ x0: v, y0: n.y0, x1: v, y1: n.y1 })
          rectA = { x0: n.x0, y0: n.y0, x1: v, y1: n.y1 }
          rectB = { x0: v, y0: n.y0, x1: n.x1, y1: n.y1 }
        } else {
          segs.push({ x0: n.x0, y0: v, x1: n.x1, y1: v })
          rectA = { x0: n.x0, y0: n.y0, x1: n.x1, y1: v }
          rectB = { x0: n.x0, y0: v, x1: n.x1, y1: n.y1 }
        }

        ;[[a, rectA], [b, rectB]].forEach(([arr, r]) => {
          if (arr.length === 1) {
            depthOf[arr[0]] = level + 1
            iso.push({ i: arr[0], rect: r })
          } else if (arr.length > 1) {
            next.push({ idx: arr, x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1 })
          }
        })
      })

      levels.push({ segs, iso })
      nodes = next
      level++
    }

    // на случай, если что-то осталось после ограничения по глубине
    nodes.forEach(n => n.idx.forEach(i => { depthOf[i] = level }))

    return { levels, depthOf }
  }

  let W = 0, H = 0, dpr = 1,
      pts, tree, starts, isoTime, anomalies, summary,
      endOfTree, fadeStart, total

  const newScene = () => {
    pts = makePoints()
    tree = buildTree(pts)

    starts = []
    let t = START
    tree.levels.forEach((lv, l) => {
      starts.push(t)
      t += levelDuration(l)
    })

    endOfTree = t
    fadeStart = endOfTree + HOLD
    total = fadeStart + FADE_OUT

    isoTime = pts.map(() => Infinity)
    tree.levels.forEach((lv, l) => {
      lv.iso.forEach(item => {
        isoTime[item.i] = starts[l] + levelDuration(l) * DRAW_FRAC
      })
    })
    pts.forEach((p, i) => { if (isoTime[i] === Infinity) isoTime[i] = endOfTree })

    anomalies = []
    const normals = []
    pts.forEach((p, i) => (p.out ? anomalies : normals).push(i))

    const avg = (list) => list.length ? list.reduce((s, i) => s + tree.depthOf[i], 0) / list.length : 0
    summary = 'Аномалии изолированы в среднем за ' + fmt(avg(anomalies)) +
              ' разреза, обычные точки — за ' + fmt(avg(normals)) + ' разреза'
  }

  const setCaption = (text) => {
    if (caption && caption.textContent !== text) caption.textContent = text
  }

  const captionAt = (t) => {
    if (t < START) return 'Isolation Forest: ищем аномалии случайными разрезами'

    if (t < endOfTree) {
      let level = 0
      starts.forEach((s, l) => { if (t >= s) level = l + 1 })
      const foundCount = anomalies.filter(i => t >= isoTime[i]).length
      return 'Разрез ' + level + ' · найдено аномалий: ' + foundCount + ' из ' + anomalies.length
    }

    return summary
  }

  const fit = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = canvas.getBoundingClientRect()
    W = rect.width
    H = rect.height
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
  }

  const render = (t) => {
    if (!W || !H) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)

    const gx = (x) => PAD + x * (W - 2 * PAD),
          gy = (y) => PAD + y * (H - 2 * PAD)

    ctx.globalAlpha = t > fadeStart ? clamp(1 - (t - fadeStart) / FADE_OUT, 0, 1) : 1

    // рамка поля
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)'
    ctx.strokeRect(gx(0), gy(0), W - 2 * PAD, H - 2 * PAD)

    // области, в которых изолирована аномалия
    tree.levels.forEach(lv => {
      lv.iso.forEach(item => {
        if (!pts[item.i].out) return
        const a = clamp((t - isoTime[item.i]) / 0.5, 0, 1)
        if (a <= 0) return

        const r = item.rect,
              rx = gx(r.x0), ry = gy(r.y0),
              rw = gx(r.x1) - gx(r.x0), rh = gy(r.y1) - gy(r.y0)

        ctx.fillStyle = 'rgba(' + COLOR_ANOMALY + ', ' + (0.10 * a) + ')'
        ctx.fillRect(rx, ry, rw, rh)
        ctx.strokeStyle = 'rgba(' + COLOR_ANOMALY + ', ' + (0.5 * a) + ')'
        ctx.strokeRect(rx, ry, rw, rh)
      })
    })

    // линии разрезов (рисуются постепенно, уровень за уровнем)
    ctx.lineWidth = 1
    tree.levels.forEach((lv, l) => {
      const p = easeOut(clamp((t - starts[l]) / (levelDuration(l) * DRAW_FRAC), 0, 1))
      if (p <= 0) return

      ctx.strokeStyle = 'rgba(' + COLOR_LINE + ', ' + Math.max(0.28, 0.75 - l * 0.05) + ')'
      ctx.beginPath()
      lv.segs.forEach(s => {
        ctx.moveTo(gx(s.x0), gy(s.y0))
        ctx.lineTo(gx(s.x0 + (s.x1 - s.x0) * p), gy(s.y0 + (s.y1 - s.y0) * p))
      })
      ctx.stroke()
    })

    // точки
    pts.forEach((pt, i) => {
      const appear = clamp((t - i * 0.004) / 0.6, 0, 1)
      if (appear <= 0) return

      const x = gx(pt.x), y = gy(pt.y),
            isolated = t >= isoTime[i]

      if (pt.out && isolated) {
        const u = clamp((t - isoTime[i]) / 0.9, 0, 1)

        ctx.lineWidth = 1.5
        ctx.strokeStyle = 'rgba(' + COLOR_ANOMALY + ', ' + (0.8 * (1 - u)) + ')'
        ctx.beginPath()
        ctx.arc(x, y, 5 + 22 * u, 0, Math.PI * 2)
        ctx.stroke()

        ctx.shadowBlur = 14
        ctx.shadowColor = 'rgba(' + COLOR_ANOMALY + ', 0.9)'
        ctx.fillStyle = 'rgb(' + COLOR_ANOMALY + ')'
        ctx.beginPath()
        ctx.arc(x, y, 3.8, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      } else {
        const dim = isolated ? 0.6 : 1
        ctx.fillStyle = 'rgba(' + COLOR_POINT + ', ' + (0.9 * appear * dim) + ')'
        ctx.beginPath()
        ctx.arc(x, y, 2.4, 0, Math.PI * 2)
        ctx.fill()
      }
    })

    ctx.globalAlpha = 1
    setCaption(captionAt(t))
  }

  let clock = 0,
      last = performance.now(),
      visible = true

  const tick = (now) => {
    const dt = Math.min((now - last) / 1000, 0.1)
    last = now

    if (visible && !document.hidden) {
      clock += dt
      if (clock >= total) {
        newScene()
        clock = 0
      }
      render(clock)
    }

    requestAnimationFrame(tick)
  }

  // анимируем только когда блок виден на экране
  if (typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting
    }, { threshold: 0.05 }).observe(canvas)
  }

  const redraw = () => {
    fit()
    render(REDUCE_MOTION ? endOfTree + 0.01 : clock)
  }

  window.addEventListener('resize', redraw)
  window.addEventListener('load', redraw)

  newScene()
  fit()

  if (REDUCE_MOTION) {
    // без анимации: показываем готовый результат
    render(endOfTree + 0.01)
  } else {
    requestAnimationFrame(tick)
  }
})()