document.addEventListener("DOMContentLoaded", function () {
  const preset = document.getElementById("id_theme_preset");
  const primary = document.getElementById("id_primary_color");
  const secondary = document.getElementById("id_secondary_color");
  const accent = document.getElementById("id_accent_color");
  const inputs = [primary, secondary, accent];

  if (!preset || inputs.some((input) => !input)) return;

  let palettes = {};
  try {
    palettes = JSON.parse(preset.dataset.themePresets || "{}");
  } catch {
    return;
  }

  inputs.forEach(function (input) {
    input.style.width = "82px";
    input.style.height = "42px";
    input.style.padding = "3px";
    input.style.cursor = "pointer";
  });

  const preview = document.createElement("div");
  preview.setAttribute("aria-label", "Selected colour theme preview");
  preview.style.display = "flex";
  preview.style.gap = "6px";
  preview.style.marginTop = "10px";
  preset.insertAdjacentElement("afterend", preview);

  function updatePreview() {
    preview.replaceChildren();
    inputs.forEach(function (input) {
      const swatch = document.createElement("span");
      swatch.title = input.value;
      swatch.style.width = "42px";
      swatch.style.height = "22px";
      swatch.style.border = "1px solid rgba(0, 0, 0, .18)";
      swatch.style.borderRadius = "4px";
      swatch.style.background = input.value;
      preview.appendChild(swatch);
    });
  }

  function updateAdminTheme() {
    document.documentElement.style.setProperty("--primary", primary.value);
    document.documentElement.style.setProperty("--secondary", secondary.value);
    document.documentElement.style.setProperty("--accent", accent.value);
  }

  function applyPreset() {
    const colours = palettes[preset.value];
    if (!Array.isArray(colours) || colours.length !== 3) return;
    inputs.forEach(function (input, index) {
      input.value = colours[index];
    });
    updatePreview();
    updateAdminTheme();
  }

  preset.addEventListener("change", applyPreset);
  if (window.django && window.django.jQuery) {
    window.django.jQuery(preset).on("change.siteSettingColours", applyPreset);
  }
  if (window.jQuery) {
    window.jQuery(preset).on("change.siteSettingColoursGlobal", applyPreset);
  }

  inputs.forEach(function (input) {
    input.addEventListener("input", function () {
      preset.value = "custom";
      updatePreview();
      updateAdminTheme();
    });
  });

  updatePreview();
  updateAdminTheme();
});
