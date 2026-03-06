Module.register("MMM-AuroraForecast", {

  defaults: {
    updateInterval: 30,   // minutes
    latitude: 0,
    longitude: 0,
    location: "My Location",
    layout: "detailed"    // "detailed" or "compact"
  },

  getStyles() {
    return ["MMM-AuroraForecast.css"];
  },

  start() {
    this.auroraData = null;
    this.fetchData();
    setInterval(() => this.fetchData(), this.config.updateInterval * 60 * 1000);
  },

  fetchData() {
    this.sendSocketNotification("GET_AURORA_DATA", {
      latitude: this.config.latitude,
      longitude: this.config.longitude
    });
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "AURORA_DATA") {
      this.auroraData = payload;
      this.updateDom();
    }
  },

  // Returns a hex color based on Kp value
  kpColor(kp) {
    if (kp >= 7) return "#e03020";
    if (kp >= 5) return "#f07030";
    if (kp >= 3) return "#f0c040";
    return "#668899";
  },

  // Human-readable G-scale label
  stormLabel(g) {
    const labels = { G1: "Minor", G2: "Moderate", G3: "Strong", G4: "Severe", G5: "Extreme" };
    return labels[g] || g;
  },

  getDomCompact() {
    const wrapper = document.createElement("div");
    wrapper.className = "aurora-module aurora-compact";

    if (!this.auroraData) {
      wrapper.innerHTML = `<div class="aurora-loading dimmed">Loading...</div>`;
      return wrapper;
    }

    const { auroraProb, currentSlot, dailySummary } = this.auroraData;
    const today = dailySummary[0];
    const currentKp = currentSlot ? currentSlot.kpValue : today.peakKp;
    wrapper.innerHTML = `
      <div class="compact-prob">
        <span class="compact-prob-value">${auroraProb}<span class="compact-prob-pct">%</span></span>
        <span class="compact-location dimmed">${this.config.location}</span>
      </div>
      <div class="compact-kp">
        <span class="compact-kp-label dimmed">Kp</span>
        <span class="compact-kp-value" style="color:${this.kpColor(currentKp)}">${currentKp.toFixed(2)}</span>
      </div>
    `;
    return wrapper;
  },

  getDom() {
    if (this.config.layout === "compact") return this.getDomCompact();

    const wrapper = document.createElement("div");
    wrapper.className = "aurora-module";

    if (!this.auroraData) {
      wrapper.innerHTML = `<div class="aurora-loading dimmed">Loading aurora data...</div>`;
      return wrapper;
    }

    const { auroraProb, issued, rationale, currentSlot, dailySummary } = this.auroraData;

    if (!dailySummary || dailySummary.length === 0) {
      wrapper.innerHTML = `<div class="aurora-loading dimmed">No forecast data available.</div>`;
      return wrapper;
    }

    const today = dailySummary[0];
    const currentKp = currentSlot ? currentSlot.kpValue : today.peakKp;
    const currentStorm = currentSlot ? currentSlot.geomagneticStorm : today.peakStorm;

    // --- Current section ---
    const stormBadgeHtml = currentStorm
      ? `<div class="aurora-storm-badge ${currentStorm.toLowerCase()}">&#9888; ${currentStorm} ${this.stormLabel(currentStorm)} Storm</div>`
      : "";

    const currentHtml = `
      <div class="aurora-current">
        <div class="aurora-prob-block">
          <span class="aurora-prob-value">${auroraProb}<span class="aurora-prob-pct">%</span></span>
          <span class="aurora-location dimmed">${this.config.location}</span>
        </div>
        <div class="aurora-kp-block">
          <span class="aurora-kp-label dimmed">Kp index</span>
          <span class="aurora-kp-value" style="color:${this.kpColor(currentKp)}">${currentKp.toFixed(2)}</span>
        </div>
      </div>
      ${stormBadgeHtml}
    `;

    // --- Rationale ---
    const rationaleHtml = rationale
      ? `<div class="aurora-rationale dimmed">${rationale}</div>`
      : "";

    // --- Today's time slot breakdown (current + future only) ---
    const now = new Date();
    const slotsHtml = today.slots.filter(slot => new Date(slot.timePeriodEnd) > now).map(slot => {
      const isCurrent = currentSlot && currentSlot.timePeriodStart === slot.timePeriodStart;
      const barPct = Math.round((slot.kpValue / 9) * 100);
      const stormTag = slot.geomagneticStorm
        ? `<span class="slot-storm" style="color:${this.kpColor(slot.kpValue)}">${slot.geomagneticStorm}</span>`
        : `<span class="slot-storm"></span>`;
      return `
        <div class="aurora-slot${isCurrent ? " current" : ""}">
          <span class="slot-time dimmed">${slot.timePeriod}</span>
          <div class="slot-bar-container">
            <div class="slot-bar" style="width:${barPct}%;background:${this.kpColor(slot.kpValue)}"></div>
          </div>
          <span class="slot-kp" style="color:${this.kpColor(slot.kpValue)}">${slot.kpValue.toFixed(2)}</span>
          ${stormTag}
        </div>
      `;
    }).join("");

    const todayHtml = `
      <div class="aurora-section-header dimmed">TODAY &mdash; ${today.date}</div>
      <div class="aurora-slots">${slotsHtml}</div>
    `;

    // --- 3-day peak summary ---
    const daysHtml = dailySummary.map(day => {
      const barPct = Math.round((day.peakKp / 9) * 100);
      const stormTag = day.peakStorm
        ? `<div class="day-storm" style="color:${this.kpColor(day.peakKp)}">${day.peakStorm}</div>`
        : `<div class="day-storm"></div>`;
      return `
        <div class="aurora-day">
          <div class="day-label dimmed">${day.date}</div>
          <div class="day-kp" style="color:${this.kpColor(day.peakKp)}">${day.peakKp.toFixed(2)}</div>
          ${stormTag}
          <div class="day-bar-container">
            <div class="day-bar" style="width:${barPct}%;background:${this.kpColor(day.peakKp)}"></div>
          </div>
        </div>
      `;
    }).join("");

    const summaryHtml = `
      <div class="aurora-section-header dimmed">3-DAY PEAK Kp</div>
      <div class="aurora-3day">${daysHtml}</div>
    `;

    // --- Footer ---
    const issuedHtml = `<div class="aurora-issued dimmed">Updated: ${issued}</div>`;

    wrapper.innerHTML = `
      ${currentHtml}
      <div class="aurora-divider"></div>
      ${rationaleHtml}
      <div class="aurora-divider"></div>
      ${todayHtml}
      <div class="aurora-divider"></div>
      ${summaryHtml}
      ${issuedHtml}
    `;

    return wrapper;
  }
});
