import Swal from 'sweetalert2'

// Configure default settings for SweetAlert
const defaultSettings = {
  confirmButtonColor: '#3b82f6',
  cancelButtonColor: '#ef4444',
  background: 'var(--bg-color, #ffffff)',
  color: 'var(--text-color, #1f2937)',
  customClass: {
    popup: 'dark:bg-gray-800 dark:text-white',
    title: 'dark:text-white',
    content: 'dark:text-gray-300',
    confirmButton: 'px-4 py-2 rounded-lg font-medium',
    cancelButton: 'px-4 py-2 rounded-lg font-medium',
  }
}

// Success alert
export const showSuccess = (title, text = '', options = {}) => {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    timer: 3000,
    timerProgressBar: true,
    showConfirmButton: false,
    ...defaultSettings,
    ...options
  })
}

// Error alert
export const showError = (title, text = '', options = {}) => {
  return Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonText: 'OK',
    ...defaultSettings,
    ...options
  })
}

// Warning alert
export const showWarning = (title, text = '', options = {}) => {
  return Swal.fire({
    icon: 'warning',
    title,
    text,
    confirmButtonText: 'OK',
    ...defaultSettings,
    ...options
  })
}

// Info alert
export const showInfo = (title, text = '', options = {}) => {
  return Swal.fire({
    icon: 'info',
    title,
    text,
    confirmButtonText: 'OK',
    ...defaultSettings,
    ...options
  })
}

// Confirmation dialog
export const showConfirm = (title, text = '', options = {}) => {
  return Swal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'Cancel',
    ...defaultSettings,
    ...options
  })
}

// Simple notification (replaces basic alert)
export const notify = (message, type = 'info') => {
  const iconMap = {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info'
  }

  return Swal.fire({
    text: message,
    icon: iconMap[type] || 'info',
    timer: 3000,
    timerProgressBar: true,
    showConfirmButton: false,
    toast: true,
    position: 'top-end',
    ...defaultSettings
  })
}

// Loading alert
export const showLoading = (title = 'Please wait...', text = '') => {
  return Swal.fire({
    title,
    text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading()
    },
    ...defaultSettings
  })
}

// Close any open alert
export const closeAlert = () => {
  Swal.close()
}

// Input dialog
export const showInput = (title, inputType = 'text', options = {}) => {
  return Swal.fire({
    title,
    input: inputType,
    inputAttributes: {
      autocapitalize: 'off'
    },
    showCancelButton: true,
    confirmButtonText: 'Submit',
    cancelButtonText: 'Cancel',
    showLoaderOnConfirm: true,
    ...defaultSettings,
    ...options
  })
}

// Multi-line credentials display
export const showCredentials = (title, email, password, additionalInfo = '') => {
  return Swal.fire({
    title,
    html: `
      <div class="text-left space-y-3">
        <div>
          <strong>Email:</strong> ${email}
        </div>
        <div>
          <strong>Password:</strong> 
          <code class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">${password}</code>
        </div>
        ${additionalInfo ? `<div class="text-sm text-gray-600 dark:text-gray-400 mt-3">${additionalInfo}</div>` : ''}
        <div class="text-sm text-orange-600 dark:text-orange-400 mt-3">
          ⚠️ Please save these credentials securely.
        </div>
      </div>
    `,
    confirmButtonText: 'Got it!',
    width: '500px',
    ...defaultSettings
  })
}

export default {
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showConfirm,
  notify,
  showLoading,
  closeAlert,
  showInput,
  showCredentials
}
