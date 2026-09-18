import { getCurrentLanguage } from './i18n.js';
import { Events, APP_EVENTS } from './events.js';

// Font Awesome Free 6.4 icons. Keep the stored value as a single fa-* class.
const ICONS = [
    ['fa-laptop-code', 'Programação', 'Programming'],
    ['fa-shield-halved', 'Segurança', 'Security'],
    ['fa-database', 'Base de dados', 'Database'],
    ['fa-server', 'Servidor', 'Server'],
    ['fa-network-wired', 'Redes', 'Networks'],
    ['fa-microchip', 'Microchip', 'Microchip'],
    ['fa-graduation-cap', 'Educação', 'Education'],
    ['fa-book', 'Livro', 'Book'],
    ['fa-book-open', 'Leitura', 'Reading'],
    ['fa-pen', 'Escrita', 'Writing'],
    ['fa-language', 'Línguas', 'Languages'],
    ['fa-landmark', 'História', 'History'],
    ['fa-globe', 'Geografia', 'Geography'],
    ['fa-earth-europe', 'Mundo', 'World'],
    ['fa-scale-balanced', 'Direito', 'Law'],
    ['fa-calculator', 'Matemática', 'Mathematics'],
    ['fa-infinity', 'Infinito', 'Infinity'],
    ['fa-chart-line', 'Estatística', 'Statistics'],
    ['fa-chart-pie', 'Economia', 'Economics'],
    ['fa-coins', 'Finanças', 'Finance'],
    ['fa-briefcase', 'Gestão', 'Management'],
    ['fa-flask', 'Química', 'Chemistry'],
    ['fa-atom', 'Física', 'Physics'],
    ['fa-dna', 'Biologia', 'Biology'],
    ['fa-leaf', 'Ambiente', 'Environment'],
    ['fa-seedling', 'Agricultura', 'Agriculture'],
    ['fa-heart-pulse', 'Saúde', 'Health'],
    ['fa-stethoscope', 'Medicina', 'Medicine'],
    ['fa-brain', 'Psicologia', 'Psychology'],
    ['fa-palette', 'Arte', 'Art'],
    ['fa-paintbrush', 'Pintura', 'Painting'],
    ['fa-music', 'Música', 'Music'],
    ['fa-film', 'Cinema', 'Film'],
    ['fa-camera', 'Fotografia', 'Photography'],
    ['fa-masks-theater', 'Teatro', 'Theatre'],
    ['fa-code', 'Código', 'Code'],
    ['fa-robot', 'Robótica', 'Robotics'],
    ['fa-gears', 'Engenharia', 'Engineering'],
    ['fa-bolt', 'Eletricidade', 'Electricity'],
    ['fa-house', 'Arquitetura', 'Architecture'],
    ['fa-building-columns', 'Política', 'Politics'],
    ['fa-people-group', 'Sociologia', 'Sociology'],
    ['fa-comments', 'Comunicação', 'Communication'],
    ['fa-utensils', 'Alimentação', 'Food'],
    ['fa-futbol', 'Desporto', 'Sport'],
    ['fa-plane', 'Viagens', 'Travel'],
    ['fa-star', 'Geral', 'General'],
    ['fa-lightbulb', 'Ideias', 'Ideas']
];

const CATEGORIES = [
    { name: ['Tecnologia', 'Technology'], icons: ['fa-laptop-code', 'fa-shield-halved', 'fa-database', 'fa-server', 'fa-network-wired', 'fa-microchip', 'fa-code', 'fa-robot', 'fa-gears', 'fa-bolt', 'fa-house', 'fa-lightbulb'] },
    { name: ['Ciências', 'Sciences'], icons: ['fa-calculator', 'fa-infinity', 'fa-chart-line', 'fa-flask', 'fa-atom', 'fa-dna', 'fa-leaf', 'fa-seedling', 'fa-heart-pulse', 'fa-stethoscope', 'fa-brain', 'fa-globe'] },
    { name: ['Sociedade', 'Society'], icons: ['fa-language', 'fa-landmark', 'fa-earth-europe', 'fa-scale-balanced', 'fa-chart-pie', 'fa-coins', 'fa-briefcase', 'fa-building-columns', 'fa-people-group', 'fa-comments', 'fa-graduation-cap', 'fa-book'] },
    { name: ['Criatividade', 'Creativity'], icons: ['fa-book-open', 'fa-pen', 'fa-palette', 'fa-paintbrush', 'fa-music', 'fa-film', 'fa-camera', 'fa-masks-theater', 'fa-utensils', 'fa-futbol', 'fa-plane', 'fa-star'] }
];

export function initCadeiraIconPicker() {
    const grid = document.getElementById('cadeira-icon-grid');
    const categories = document.getElementById('cadeira-icon-categories');
    let selectedIcon = 'fa-laptop-code';
    if (!grid || !categories) return () => selectedIcon;

    const buttons = new Map(ICONS.map(([icon, pt, en]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'icon-option';
        button.dataset.icon = icon;
        button.setAttribute('aria-label', getCurrentLanguage() === 'en' ? en : pt);
        button.setAttribute('aria-pressed', String(icon === selectedIcon));
        button.title = getCurrentLanguage() === 'en' ? en : pt;
        button.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i>`;
        if (icon === selectedIcon) button.classList.add('selected');
        button.addEventListener('click', () => {
            const previous = buttons.get(selectedIcon);
            previous.classList.remove('selected');
            previous.setAttribute('aria-pressed', 'false');
            button.classList.add('selected');
            button.setAttribute('aria-pressed', 'true');
            selectedIcon = icon;
            categories.querySelectorAll('button').forEach((tab, index) => {
                tab.classList.toggle('has-selection', CATEGORIES[index].icons.includes(icon));
            });
        });
        return [icon, button];
    }));

    const showCategory = (category, activeTab) => {
        categories.querySelectorAll('button').forEach(tab => {
            const active = tab === activeTab;
            tab.classList.toggle('active', active);
            tab.setAttribute('aria-pressed', String(active));
        });
        grid.replaceChildren(...category.icons.map(icon => buttons.get(icon)));
    };

    CATEGORIES.forEach((category, index) => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'cadeira-icon-category';
        tab.textContent = category.name[getCurrentLanguage() === 'en' ? 1 : 0];
        tab.addEventListener('click', () => showCategory(category, tab));
        categories.appendChild(tab);
        if (index === 0) showCategory(category, tab);
    });
    categories.firstElementChild.classList.add('has-selection');
    Events.on(APP_EVENTS.LANGUAGE_CHANGED, () => {
        const languageIndex = getCurrentLanguage() === 'en' ? 1 : 0;
        CATEGORIES.forEach((category, index) => {
            categories.children[index].textContent = category.name[languageIndex];
        });
        ICONS.forEach(([icon, pt, en]) => {
            const label = languageIndex === 1 ? en : pt;
            const button = buttons.get(icon);
            button.title = label;
            button.setAttribute('aria-label', label);
        });
    });
    return () => selectedIcon;
}
