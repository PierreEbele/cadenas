import { defineConfig } from 'vitepress';

const GITHUB = 'https://github.com/PierreEbele/cadenas';

// Ancres comme sur GitHub (accents gardés) : les liens des documents du dépôt
// vers un titre, comme SECURITY.fr.md#vérifier-ce-que-vous-téléchargez,
// restent valables une fois copiés dans le site.
const slugify = (title) =>
  title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');

const sidebarFr = [
  {
    text: 'Guide',
    items: [
      { text: 'Démarrer', link: '/guide/getting-started' },
      { text: 'Utiliser le site', link: '/guide/website' },
      { text: 'Envoyer un fichier chiffré', link: '/guide/sharing' },
      { text: 'Choisir un mot de passe', link: '/guide/passwords' },
      { text: 'Ligne de commande', link: '/guide/cli' },
      { text: 'Héberger avec Docker', link: '/guide/docker' },
      { text: 'Bibliothèque JavaScript', link: '/guide/library' },
      { text: 'Formats .cadenas et .age', link: '/guide/formats' },
      { text: 'Questions fréquentes', link: '/faq' },
    ],
  },
  {
    text: 'Référence',
    items: [
      { text: 'Sécurité', link: '/reference/security' },
      { text: 'Spécification du format', link: '/reference/format' },
      { text: 'Argumentaire de sécurité', link: '/reference/assurance' },
      { text: 'Architecture', link: '/reference/architecture' },
      { text: 'Audit', link: '/reference/audit' },
      { text: 'Signature du code', link: '/reference/code-signing' },
    ],
  },
  {
    text: 'Projet',
    items: [
      { text: 'Contribuer', link: '/project/contributing' },
      { text: 'Feuille de route', link: '/project/roadmap' },
      { text: 'Historique des versions', link: '/project/changelog' },
      { text: 'Gouvernance', link: '/project/governance' },
      { text: 'Code de conduite', link: '/project/code-of-conduct' },
    ],
  },
];

const sidebarEn = [
  {
    text: 'Guide',
    items: [
      { text: 'Getting started', link: '/en/guide/getting-started' },
      { text: 'Use the website', link: '/en/guide/website' },
      { text: 'Send an encrypted file', link: '/en/guide/sharing' },
      { text: 'Choose a password', link: '/en/guide/passwords' },
      { text: 'Command line', link: '/en/guide/cli' },
      { text: 'Self-host with Docker', link: '/en/guide/docker' },
      { text: 'JavaScript library', link: '/en/guide/library' },
      { text: '.cadenas and .age formats', link: '/en/guide/formats' },
      { text: 'FAQ', link: '/en/faq' },
    ],
  },
  {
    text: 'Reference',
    items: [
      { text: 'Security', link: '/en/reference/security' },
      { text: 'Format specification', link: '/en/reference/format' },
      { text: 'Assurance case', link: '/en/reference/assurance' },
      { text: 'Architecture', link: '/en/reference/architecture' },
      { text: 'Audit', link: '/en/reference/audit' },
      { text: 'Code signing', link: '/en/reference/code-signing' },
    ],
  },
  {
    text: 'Project',
    items: [
      { text: 'Contributing', link: '/en/project/contributing' },
      { text: 'Roadmap', link: '/en/project/roadmap' },
      { text: 'Changelog', link: '/en/project/changelog' },
      { text: 'Governance', link: '/en/project/governance' },
      { text: 'Code of conduct', link: '/en/project/code-of-conduct' },
    ],
  },
];

export default defineConfig({
  title: 'cadenas',
  cleanUrls: true,
  // Notes pour les mainteneurs, pas une page du site.
  srcExclude: ['README.md'],
  // Pas de requête vers un autre domaine : polices et recherche sont servies
  // par le site lui-même.
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]],
  sitemap: { hostname: 'https://docs.getcadenas.com' },
  markdown: { anchor: { slugify } },
  // Exemple d'adresse locale (Docker) : pas une page du site.
  ignoreDeadLinks: 'localhostLinks',

  locales: {
    root: {
      label: 'Français',
      lang: 'fr',
      description: 'Documentation de cadenas : chiffrer un fichier avec un mot de passe, simplement.',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/getting-started' },
          { text: 'Référence', link: '/reference/format' },
          { text: 'Ouvrir cadenas', link: 'https://getcadenas.com/' },
        ],
        sidebar: sidebarFr,
        outline: { label: 'Sur cette page', level: [2, 3] },
        docFooter: { prev: 'Page précédente', next: 'Page suivante' },
        darkModeSwitchLabel: 'Apparence',
        lightModeSwitchTitle: 'Passer au thème clair',
        darkModeSwitchTitle: 'Passer au thème sombre',
        sidebarMenuLabel: 'Menu',
        returnToTopLabel: 'Haut de page',
        langMenuLabel: 'Langue',
        notFound: {
          title: 'PAGE INTROUVABLE',
          quote: "Cette page n'existe pas, ou plus.",
          linkText: "Retour à l'accueil",
        },
        footer: {
          message: 'Publié sous licence MIT.',
          copyright: '© Pierre Ebele',
        },
      },
    },
    en: {
      label: 'English',
      lang: 'en',
      link: '/en/',
      description: 'cadenas documentation: encrypt a file with a password, simply.',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/en/guide/getting-started' },
          { text: 'Reference', link: '/en/reference/format' },
          { text: 'Open cadenas', link: 'https://getcadenas.com/' },
        ],
        sidebar: sidebarEn,
        outline: { level: [2, 3] },
        footer: {
          message: 'Released under the MIT license.',
          copyright: '© Pierre Ebele',
        },
      },
    },
  },

  themeConfig: {
    logo: '/favicon.svg',
    socialLinks: [{ icon: 'github', link: GITHUB }],
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: { buttonText: 'Rechercher', buttonAriaLabel: 'Rechercher' },
              modal: {
                displayDetails: 'Afficher le détail',
                resetButtonTitle: 'Effacer la recherche',
                backButtonTitle: 'Fermer la recherche',
                noResultsText: 'Aucun résultat pour',
                footer: {
                  selectText: 'choisir',
                  navigateText: 'parcourir',
                  closeText: 'fermer',
                },
              },
            },
          },
        },
      },
    },
  },
});
