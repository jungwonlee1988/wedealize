// WeDealize - Profile Management
(function() {
    'use strict';

    // === Private State ===
    var cropper = null;
    var currentLogoFile = null;

    // === Public API ===

    window.saveProfile = function(e) {
        e.preventDefault();
        showToast('Profile saved successfully!');
    };

    window.handleLogoSelect = function(event) {
        var file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file.', 'error');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            showToast('File size must be less than 2MB.', 'error');
            return;
        }

        currentLogoFile = file;

        var reader = new FileReader();
        reader.onload = function(e) {
            var cropImage = document.getElementById('crop-image');
            cropImage.src = e.target.result;
            document.getElementById('crop-modal').style.display = 'flex';

            if (cropper) {
                cropper.destroy();
            }

            cropper = new Cropper(cropImage, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 0.8,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false
            });
        };
        reader.readAsDataURL(file);
    };

    window.closeCropModal = function() {
        document.getElementById('crop-modal').style.display = 'none';
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        document.getElementById('logo-input').value = '';
    };

    window.applyCrop = function() {
        if (!cropper) return;

        var canvas = cropper.getCroppedCanvas({
            width: 200,
            height: 200,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });

        if (!canvas) {
            showToast('Failed to crop image.', 'error');
            return;
        }

        var previewImg = document.getElementById('logo-preview-img');
        var placeholder = document.getElementById('logo-placeholder');
        var removeBtn = document.getElementById('remove-logo-btn');

        previewImg.src = canvas.toDataURL('image/png');
        previewImg.style.display = 'block';
        placeholder.style.display = 'none';
        removeBtn.style.display = 'inline-flex';

        closeCropModal();
        showToast('Logo updated successfully!');
    };

    window.removeLogo = function() {
        if (!confirm('Are you sure you want to remove the logo?')) return;

        var previewImg = document.getElementById('logo-preview-img');
        var placeholder = document.getElementById('logo-placeholder');
        var removeBtn = document.getElementById('remove-logo-btn');

        previewImg.src = '';
        previewImg.style.display = 'none';
        placeholder.style.display = 'flex';
        removeBtn.style.display = 'none';

        document.getElementById('logo-input').value = '';
        showToast('Logo removed.');
    };

})();
