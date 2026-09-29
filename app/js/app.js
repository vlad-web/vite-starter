import './jquery-global.js'
import '@fancyapps/fancybox'
import '@fancyapps/fancybox/dist/jquery.fancybox.css'
import Swiper from 'swiper/bundle'
import 'swiper/css/bundle'

import '@scss/main.sass'

const overlay = document.querySelector('[data-js-modal-overlay]')

function openModal(name) {
	const modal = document.querySelector(`[data-popup="${name}"]`)
	if (!modal) return

	modal.classList.add('is-open')
	overlay?.classList.add('is-open')
	document.body.classList.add('is-modal-open')
}

function closeModal() {
	document.querySelectorAll('[data-popup].is-open').forEach((modal) => modal.classList.remove('is-open'))
	overlay?.classList.remove('is-open')
	document.body.classList.remove('is-modal-open')
}

document.addEventListener('click', (event) => {
	const opener = event.target.closest('[data-modal]')
	if (opener) {
		event.preventDefault()
		openModal(opener.dataset.modal)
		return
	}

	if (event.target.closest('[data-js-modal-close]') || event.target === overlay) {
		closeModal()
	}
})

document.querySelectorAll('.swiper').forEach((el) => new Swiper(el))
