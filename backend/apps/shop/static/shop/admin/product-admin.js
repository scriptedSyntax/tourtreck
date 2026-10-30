(function () {
    "use strict";

    function updatePreview(fileInput) {
        const file = fileInput.files && fileInput.files[0];
        const row = fileInput.closest("tr");
        const preview = row && row.querySelector(".product-image-preview");
        if (!file || !preview || !file.type.startsWith("image/")) return;

        const previousUrl = preview.dataset.previewUrl;
        if (previousUrl) URL.revokeObjectURL(previousUrl);

        const objectUrl = URL.createObjectURL(file);
        preview.dataset.previewUrl = objectUrl;
        preview.classList.remove("is-empty");
        preview.innerHTML = "";
        const image = document.createElement("img");
        image.src = objectUrl;
        image.alt = "Selected product image preview";
        preview.appendChild(image);
    }

    document.addEventListener("change", function (event) {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;

        if (target.type === "file" && target.name.includes("images-")) {
            updatePreview(target);
        }

        if (target.type === "checkbox" && target.name.endsWith("-is_main") && target.checked) {
            document.querySelectorAll('input[name$="-is_main"]').forEach(function (checkbox) {
                if (checkbox !== target) checkbox.checked = false;
            });
        }
    });

})();
