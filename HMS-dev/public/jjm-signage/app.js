/**
 * JJM Hospital - Scope of Services: Department of Physiotherapy
 * 4:3 Screen Digital Signage - Client-side UI Controls
 * (Contains ONLY the 49 original services from scope of services.xlsx)
 */

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const isEmbed = urlParams.get('embed') === '1';
  const urlDept = (urlParams.get('dept') || '').trim();

  // DOM References
  const viewportContainer = document.getElementById('viewportContainer');
  const screenCanvas = document.getElementById('screenCanvas');
  const columnsGrid = document.getElementById('columnsGrid');

  const listCol1 = document.getElementById('listCol1');
  const listCol2 = document.getElementById('listCol2');
  const listCol3 = document.getElementById('listCol3');
  const listCol4 = document.getElementById('listCol4');

  const countCol1 = document.getElementById('countCol1');
  const countCol2 = document.getElementById('countCol2');
  const countCol3 = document.getElementById('countCol3');
  const countCol4 = document.getElementById('countCol4');

  const btnToggleAspect = document.getElementById('btnToggleAspect');
  const btnToggleTheme = document.getElementById('btnToggleTheme');
  const themeLabel = document.getElementById('themeLabel');
  const btnToggleDist = document.getElementById('btnToggleDist');
  const distLabel = document.getElementById('distLabel');
  const btnToggleHeader = document.getElementById('btnToggleHeader');
  const btnRestoreTopBar = document.getElementById('btnRestoreTopBar');
  let isTopBarHidden = false;

  const btnFontDec = document.getElementById('btnFontDec');
  const btnFontReset = document.getElementById('btnFontReset');
  const btnFontInc = document.getElementById('btnFontInc');
  const btnFullscreen = document.getElementById('btnFullscreen');
  const btnPrint = document.getElementById('btnPrint');

  let isDarkMode = false;
  let is4x3Locked = true;
  let isBalanced = false;
  let isHeaderHidden = false;
  let fontScale = 1.0;

  // Cache all 49 cards
  const allCards = Array.from(document.querySelectorAll('.service-card'));
  let packedCards = [];

  function createServiceCard(item) {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.setAttribute('data-id', item.sNo);
    card.innerHTML = `
      <span class="card-num">${item.sNo}</span>
      <div class="card-content">
        <span class="item-en">${item.en}</span>
        ${item.hi ? `<span class="item-hi">${item.hi}</span>` : ''}
      </div>
    `;
    return card;
  }

  function packCardsIntoColumns(cards) {
    const colLists = [listCol1, listCol2, listCol3, listCol4];
    colLists.forEach((col) => {
      if (!col) return;
      col.innerHTML = '';
      col.style.gridTemplateRows = 'none';
      col.style.alignContent = 'start';
    });

    // Row-wise: 1|2|3|4 then 5|6|7|8 so all columns fill evenly.
    cards.forEach((card, index) => {
      colLists[index % colLists.length]?.appendChild(card);
    });
  }

  function fillColumnsByHeight(services) {
    packedCards = services.map(createServiceCard);
    if (columnsGrid) columnsGrid.className = 'columns-grid';
    packCardsIntoColumns(packedCards);
  }

  function columnOverflows(lists) {
    return lists.some((list) => list.scrollHeight > list.clientHeight + 1);
  }

  function fitServicesLayout() {
    const lists = [listCol1, listCol2, listCol3, listCol4].filter(Boolean);
    if (!lists.length) return;

    const maxCount = Math.max(...lists.map((list) => list.children.length), 1);
    const sample = lists.find((list) => list.clientHeight > 0) || lists[0];
    const colHeight = sample.clientHeight;
    if (!colHeight) {
      requestAnimationFrame(fitServicesLayout);
      return;
    }

    const gap = maxCount > 12 ? 2 : maxCount > 8 ? 3 : 4;
    let scale = maxCount >= 14 ? 0.95 : maxCount >= 10 ? 1.08 : maxCount >= 6 ? 1.2 : 1.32;
    const padY = maxCount >= 12 ? 3 : 5;
    const numSize = maxCount >= 12 ? 20 : 24;

    const root = document.documentElement;
    root.style.setProperty('--fs-scale', scale.toFixed(3));
    root.style.setProperty('--card-pad-y', `${padY}px`);
    root.style.setProperty('--card-gap', `${gap}px`);
    root.style.setProperty('--card-num-size', `${numSize}px`);

    requestAnimationFrame(() => {
      let guard = 0;
      const relayout = () => {
        if (packedCards.length) packCardsIntoColumns(packedCards);
      };
      relayout();
      while (columnOverflows(lists) && scale > 0.6 && guard < 24) {
        scale -= 0.05;
        root.style.setProperty('--fs-scale', scale.toFixed(3));
        void sample.offsetHeight;
        relayout();
        guard += 1;
      }
    });
  }

  // 2. TOP HEADER BAR HIDE / UNHIDE TOGGLING
  function toggleTopBar() {
    isTopBarHidden = !isTopBarHidden;
    document.body.classList.toggle('topbar-hidden', isTopBarHidden);
  }

  if (btnToggleHeader) {
    btnToggleHeader.addEventListener('click', toggleTopBar);
  }

  if (btnRestoreTopBar) {
    btnRestoreTopBar.addEventListener('click', toggleTopBar);
  }

  // Department Metadata & Titles (Clean UTF-8 Hindi & English)
  const DEPT_METADATA = {
    physiotherapy: {
      name: 'Physiotherapy',
      titleEn: 'SCOPE OF SERVICES : DEPARTMENT OF PHYSIOTHERAPY',
      titleHi: 'कार्यक्षेत्र : फिजियोथेरेपी विभाग',
      helpline: 'Physiotherapy Helpline / Appointment: +91-5947-275000',
      location: 'Physical Rehabilitation Center: Ground Floor, Block-B'
    },
    radiology: {
      name: 'Radiology',
      titleEn: 'SCOPE OF SERVICES : DEPARTMENT OF RADIOLOGY',
      titleHi: 'कार्यक्षेत्र : रेडियोलॉजी विभाग',
      helpline: 'Radiology Helpline / Appointment: +91-5947-275000',
      location: 'Radio-Diagnosis & Imaging Center: Ground Floor, Block-A'
    },
    paediatrics: {
      name: 'Paediatrics',
      titleEn: 'SCOPE OF SERVICES : DEPARTMENT OF PAEDIATRICS',
      titleHi: 'कार्यक्षेत्र : बाल रोग विभाग',
      helpline: 'Paediatrics Helpline / Appointment: +91-5947-275000',
      location: 'Paediatrics OPD & NICU/PICU: 1st Floor, Block-A'
    },
    orthopaedics: {
      name: 'Orthopaedics',
      titleEn: 'SCOPE OF SERVICES : DEPARTMENT OF ORTHOPAEDICS',
      titleHi: 'कार्यक्षेत्र : ऑर्थोपेडिक्स विभाग',
      helpline: 'Orthopaedics Helpline / Appointment: +91-5947-275000',
      location: 'Orthopaedics & Joint Care: Ground Floor, Block-B'
    },
    nephrology: {
      name: 'Nephrology',
      titleEn: 'SCOPE OF SERVICES : DEPARTMENT OF NEPHROLOGY',
      titleHi: 'कार्यक्षेत्र : नेफ्रोलॉजी विभाग',
      helpline: 'Nephrology & Dialysis Helpline: +91-5947-275000',
      location: 'Dialysis & Nephrology Unit: 2nd Floor, Block-B'
    },
    anaesthesiology: {
      name: 'Anaesthesiology',
      titleEn: 'SCOPE OF SERVICES : DEPARTMENT OF ANAESTHESIOLOGY',
      titleHi: 'कार्यक्षेत्र : एनेस्थिसियोलॉजी विभाग',
      helpline: 'Anaesthesia & OT Helpline: +91-5947-275000',
      location: 'Operation Theatre & Critical Care: 1st Floor, Block-C'
    },
    emergency_medicine: {
      name: 'Emergency Medicine',
      titleEn: 'SCOPE OF SERVICES : DEPARTMENT OF EMERGENCY MEDICINE',
      titleHi: 'कार्यक्षेत्र : आपातकालीन चिकित्सा विभाग',
      helpline: 'Emergency & Trauma (24x7): +91-5947-275000',
      location: 'Emergency & Trauma Care: Ground Floor (24x7 Entry)'
    },
    neurosurgery: {
      name: 'Neurosurgery',
      titleEn: 'SCOPE OF SERVICES : DEPARTMENT OF NEUROSURGERY',
      titleHi: 'कार्यक्षेत्र : न्यूरोसर्जरी विभाग',
      helpline: 'Neurosurgery Helpline / Appointment: +91-5947-275000',
      location: 'Neuro Sciences Center: 2nd Floor, Block-A'
    },
    general_surgery: {
      name: 'General Surgery',
      titleEn: 'SCOPE OF SERVICES : DEPARTMENT OF GENERAL SURGERY',
      titleHi: 'कार्यक्षेत्र : जनरल सर्जरी विभाग',
      helpline: 'General Surgery Helpline: +91-5947-275000',
      location: 'Surgical OPD & Day Care: 1st Floor, Block-B'
    },
    medicine: {
      name: 'Medicine',
      titleEn: 'SCOPE OF SERVICES : DEPARTMENT OF MEDICINE',
      titleHi: 'कार्यक्षेत्र : मेडिसिन विभाग',
      helpline: 'Medicine Helpline / Appointment: +91-5947-275000',
      location: 'Internal Medicine OPD: 1st Floor, Block-A'
    },
    obg: {
      name: 'Obstetrics & Gynaecology',
      titleEn: 'SCOPE OF SERVICES : DEPARTMENT OF OBSTETRICS & GYNAECOLOGY',
      titleHi: 'कार्यक्षेत्र : प्रसूति एवं स्त्री रोग विभाग',
      helpline: 'OBG & Maternity Helpline: +91-5947-275000',
      location: 'Maternity & Gynaecology Wing: 2nd Floor, Block-C'
    }
  };

  // Department Selector Dropdown Handler (From Sheet Tabs)
  const deptSelect = document.getElementById('deptSelect');
  let currentDeptKey = 'physiotherapy';

  function renderDepartment(deptKey) {
    currentDeptKey = deptKey;
    const deptData = (typeof DEPARTMENTS_DATA !== 'undefined') ? DEPARTMENTS_DATA[deptKey] : null;
    if (!deptData) return;

    if (!isEmbed) {
      try {
        localStorage.setItem('jjm_active_department', deptKey);
      } catch (e) {
        console.warn('Could not save active department to localStorage', e);
      }
    }

    // Keep dropdown selection synced
    if (deptSelect && deptSelect.value !== deptKey) {
      deptSelect.value = deptKey;
    }

    const meta = DEPT_METADATA[deptKey] || {
      name: deptData.name,
      titleEn: deptData.titleEn,
      titleHi: deptData.titleHi,
      helpline: 'Helpline / Appointment: +91-5947-275000',
      location: 'Hospital Services: Main Block'
    };

    // 1. Update Hospital Header text with clean Hindi title
    const deptEn = document.querySelector('.dept-en');
    const deptHi = document.querySelector('.dept-hi');
    const badgeRatio = document.querySelector('.badge-ratio');
    if (deptEn) deptEn.textContent = meta.titleEn;
    if (deptHi) deptHi.textContent = meta.titleHi;
    if (badgeRatio) {
      badgeRatio.textContent = (deptKey === 'physiotherapy')
        ? '4 Groups • 49 Original Services'
        : `${meta.name} • ${deptData.totalServices} Services`;
    }

    // 2. Update Footer location & helpline info
    const footerLocation = document.querySelector('.footer-item.emergency span:last-child');
    const footerHelpline = document.querySelector('.footer-item.helpline span:last-child');
    if (footerLocation && meta.location) {
      const parts = meta.location.split(':');
      if (parts.length > 1) {
        footerLocation.innerHTML = `<strong>${parts[0]}:</strong>${parts.slice(1).join(':')}`;
      }
    }
    if (footerHelpline && meta.helpline) {
      const parts = meta.helpline.split(':');
      if (parts.length > 1) {
        footerHelpline.innerHTML = `<strong>${parts[0]}:</strong>${parts.slice(1).join(':')}`;
      }
    }

    // 3. Clear all 4 columns
    listCol1.innerHTML = '';
    listCol2.innerHTML = '';
    listCol3.innerHTML = '';
    listCol4.innerHTML = '';

    // Queue embed always fills row-wise. Standalone physiotherapy keeps the poster layout.
    if (deptKey === 'physiotherapy' && !isEmbed) {
      packedCards = [];
      if (btnToggleDist) btnToggleDist.style.display = 'inline-flex';
      applyDistribution();
      return;
    }

    // For other departments, hide the distribution switcher button
    if (btnToggleDist) btnToggleDist.style.display = 'none';

    const services = deptData.services || [];
    if (!services.length) return;

    fillColumnsByHeight(services);
    requestAnimationFrame(fitServicesLayout);
  }

  let savedDept = 'physiotherapy';
  if (urlDept && DEPT_METADATA[urlDept]) {
    savedDept = urlDept;
  } else if (!isEmbed) {
    try {
      const persisted = localStorage.getItem('jjm_active_department');
      if (persisted && DEPT_METADATA[persisted]) {
        savedDept = persisted;
      }
    } catch (e) {
      console.warn('Could not read saved department', e);
    }
  }

  if (isEmbed) {
    document.body.classList.add('topbar-hidden', 'embed-mode');
    if (viewportContainer) {
      viewportContainer.classList.remove('ratio-locked');
      viewportContainer.classList.add('stretch-mode');
    }
  }

  if (deptSelect) {
    deptSelect.value = savedDept;
    deptSelect.addEventListener('change', (e) => {
      renderDepartment(e.target.value);
    });
  }

  // Apply initial department selection on page load
  renderDepartment(savedDept);
  requestAnimationFrame(fitServicesLayout);

  if (typeof ResizeObserver !== 'undefined' && columnsGrid) {
    let resizeTimer;
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(fitServicesLayout, 80);
    });
    resizeObserver.observe(columnsGrid);
  }
  window.addEventListener('resize', fitServicesLayout);

  // 3. DISTRIBUTION SWITCHER (14-14-14-7 vs 13-12-12-12)
  if (btnToggleDist) {
    btnToggleDist.addEventListener('click', () => {
      isBalanced = !isBalanced;
      applyDistribution();
    });
  }

  function applyDistribution() {
    listCol1.innerHTML = '';
    listCol2.innerHTML = '';
    listCol3.innerHTML = '';
    listCol4.innerHTML = '';

    listCol1.style.gridTemplateRows = '';
    listCol2.style.gridTemplateRows = '';
    listCol3.style.gridTemplateRows = '';
    listCol4.style.gridTemplateRows = '';

    if (isBalanced) {
      // 13 + 12 + 12 + 12 = 49 items
      distLabel.textContent = 'Layout: Balanced (13-12-12-12)';
      columnsGrid.classList.remove('dist-14');
      columnsGrid.classList.add('dist-balanced');

      allCards.forEach((card) => {
        const id = parseInt(card.getAttribute('data-id'), 10);
        if (id <= 13) {
          listCol1.appendChild(card);
        } else if (id <= 25) {
          listCol2.appendChild(card);
        } else if (id <= 37) {
          listCol3.appendChild(card);
        } else {
          listCol4.appendChild(card);
        }
      });

      if (countCol1) countCol1.textContent = '13 Services (1 – 13)';
      if (countCol2) countCol2.textContent = '12 Services (14 – 25)';
      if (countCol3) countCol3.textContent = '12 Services (26 – 37)';
      if (countCol4) countCol4.textContent = '12 Services (38 – 49)';
    } else {
      // 14 + 14 + 14 + 7 = 49 items
      distLabel.textContent = 'Layout: 14-14-14-7';
      columnsGrid.classList.remove('dist-balanced');
      columnsGrid.classList.add('dist-14');

      allCards.forEach((card) => {
        const id = parseInt(card.getAttribute('data-id'), 10);
        if (id <= 14) {
          listCol1.appendChild(card);
        } else if (id <= 28) {
          listCol2.appendChild(card);
        } else if (id <= 42) {
          listCol3.appendChild(card);
        } else {
          listCol4.appendChild(card);
        }
      });

      if (countCol1) countCol1.textContent = '14 Services (1 – 14)';
      if (countCol2) countCol2.textContent = '14 Services (15 – 28)';
      if (countCol3) countCol3.textContent = '14 Services (29 – 42)';
      if (countCol4) countCol4.textContent = '7 Services (43 – 49)';
    }

    requestAnimationFrame(fitServicesLayout);
  }

  // 4. Aspect Ratio Lock (4:3 vs Stretch)
  if (btnToggleAspect) {
    btnToggleAspect.addEventListener('click', () => {
      is4x3Locked = !is4x3Locked;
      if (is4x3Locked) {
        viewportContainer.classList.add('ratio-locked');
        viewportContainer.classList.remove('stretch-mode');
        btnToggleAspect.querySelector('span').textContent = 'Frame: 4:3';
      } else {
        viewportContainer.classList.remove('ratio-locked');
        viewportContainer.classList.add('stretch-mode');
        btnToggleAspect.querySelector('span').textContent = 'Frame: Stretch';
      }
    });
  }

  // 5. Light / Dark Theme Toggle
  if (btnToggleTheme) {
    btnToggleTheme.addEventListener('click', () => {
      isDarkMode = !isDarkMode;
      document.body.classList.toggle('theme-dark', isDarkMode);
      document.body.classList.toggle('theme-light', !isDarkMode);
      if (themeLabel) {
        themeLabel.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
      }
    });
  }

  // 6. Font Scaling (+ / Reset / -)
  if (btnFontDec) {
    btnFontDec.addEventListener('click', () => {
      fontScale = Math.max(0.70, fontScale - 0.05);
      document.documentElement.style.setProperty('--fs-scale', fontScale);
    });
  }

  if (btnFontReset) {
    btnFontReset.addEventListener('click', () => {
      fontScale = 1.0;
      document.documentElement.style.setProperty('--fs-scale', fontScale);
    });
  }

  if (btnFontInc) {
    btnFontInc.addEventListener('click', () => {
      fontScale = Math.min(1.40, fontScale + 0.05);
      document.documentElement.style.setProperty('--fs-scale', fontScale);
    });
  }

  // 7. Fullscreen Toggle (Click or Press 'F')
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', toggleFullscreen);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen error:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  if (!isEmbed) {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        if (e.key === 'f' || e.key === 'F') {
          toggleFullscreen();
        } else if (e.key === 'h' || e.key === 'H') {
          toggleTopBar();
        }
      }
    });
  }

  // 8. Print / Export to PDF
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }
});
