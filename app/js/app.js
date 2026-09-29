import './jquery-global.js'
import '@fancyapps/fancybox'
import '@fancyapps/fancybox/dist/jquery.fancybox.css'
import Swiper from 'swiper/bundle'
import 'swiper/css/bundle'

import '@scss/main.sass'

function openModal(name) {
	const dialog = document.querySelector(`[data-popup="${name}"]`)
	dialog?.showModal()
	document.body.classList.add('no-scroll')
}

document.querySelectorAll('dialog[data-popup]').forEach((dialog) => {
	dialog.addEventListener('click', (event) => {
		if (event.target === dialog) dialog.close()
	})

	dialog.addEventListener('close', () => {
		document.body.classList.remove('no-scroll')
	})
})

document.addEventListener('click', (event) => {
	const opener = event.target.closest('[data-modal]')
	if (opener) {
		event.preventDefault()
		openModal(opener.dataset.modal)
		return
	}

	event.target.closest('[data-js-modal-close]')?.closest('dialog')?.close()
})

document.querySelectorAll('.swiper').forEach((el) => new Swiper(el))
