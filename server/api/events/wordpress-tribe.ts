import eventSourcesJSON from '@/assets/event_sources.json';
import { logTimeElapsedSince, serverCacheMaxAgeSeconds, serverStaleWhileInvalidateSeconds, serverFetchHeaders, applyEventTags } from '~~/utils/util';

export default defineCachedEventHandler(async (event) => {
	const startTime = new Date();
	const body = await fetchWordPressTribeEvents();
	logTimeElapsedSince(startTime, 'Tockify: events fetched.');
	return {
		body
	}
}, {
	maxAge: serverCacheMaxAgeSeconds,
	staleMaxAge: serverStaleWhileInvalidateSeconds,
	swr: true,
});

async function fetchWordPressTribeEvents() {
	console.log('Fetching WordPress Tribe events...')
	let wordPressTribeSources = await useStorage().getItem('wordPressTribeSources');
	try {
		wordPressTribeSources = await Promise.all(
			eventSourcesJSON.wordPressTribe.map(async (source) => {
				let wpJson = await (await fetch(source.url, { headers: serverFetchHeaders })).json();
				let wpEvents = wpJson.events;
				while (Object.hasOwn(wpJson, 'next_rest_url')) {
					let next_page_url = wpJson.next_rest_url;
					wpJson = await (await fetch(next_page_url, { headers: serverFetchHeaders })).json();
					wpEvents = wpEvents.concat(wpJson.events);
				}
				return {
					events: wpEvents.map(e => convertWordpressTribeEventToFullCalendarEvent(e, source)),
					city: source.city,
					name: source.name,
				} as EventNormalSource;
			}
			));
		await useStorage().setItem('wordPressTribeSources', wordPressTribeSources);
	} catch (error) {
		console.error(error);
	}

	return wordPressTribeSources;
};

// Strip Tribe Events plugin markup from description HTML.
// The API response embeds schedule, price, organizer, venue, and "add to calendar"
// blocks that duplicate data we already extract into structured fields.
function stripTribeMarkup(html: string): { description: string, organizer: string } {
	if (!html) return { description: '', organizer: '' };
	// Extract organizer name before stripping tribe blocks
	const organizerMatch = html.match(/<div[^>]*tribe-block__organizer__details[^>]*>[\s\S]*?<h3>([\s\S]*?)<\/h3>/i);
	const organizer = organizerMatch ? organizerMatch[ 1 ].trim() : '';
	// Remove top-level tribe divs (handles nested divs by counting open/close tags)
	html = stripTagsByClass(html, 'tribe-');
	// Remove <figure> blocks (tribe embeds images as figures; we extract images separately)
	html = html.replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '');
	// Remove empty paragraphs
	html = html.replace(/<p>\s*<\/p>/gi, '');
	return { description: html.trim(), organizer };
}

function stripTagsByClass(html: string, classPrefix: string): string {
	const pattern = new RegExp(`<div[^>]*class="[^"]*${classPrefix}[^"]*"[^>]*>`, 'gi');
	let match;
	while ((match = pattern.exec(html)) !== null) {
		let depth = 1;
		let i = match.index + match[ 0 ].length;
		while (i < html.length && depth > 0) {
			if (html.slice(i).startsWith('<div')) depth++;
			if (html.slice(i).startsWith('</div>')) depth--;
			if (depth > 0) i++;
			else break;
		}
		const end = i + '</div>'.length;
		html = html.slice(0, match.index) + html.slice(end);
		pattern.lastIndex = match.index; // reset since we mutated the string
	}
	return html;
}

// The following conversion function is basically ripped from anarchism.nyc.
// e is the event data
// source is the event source configuration
function convertWordpressTribeEventToFullCalendarEvent(e, source) {
	const venue = (!Array.isArray(e.venue) && e.venue?.venue) ? e.venue : null;
	var geoJSON = (venue?.geo_lat && venue?.geo_lng)
		? {
			type: "Point",
			coordinates: [ venue.geo_lng, venue.geo_lat ]
		}
		: null;

	const tags = applyEventTags(source, e.title, e.description)
	const { description, organizer } = stripTribeMarkup(e.description);
	return {
		title: e.title,
		start: new Date(e.utc_start_date + 'Z'),
		end: new Date(e.utc_end_date + 'Z'),
		url: e.url,
		tags,
		extendedProps: {
			raw: JSON.stringify(e, null, 2),
			description,
			organizer,
			images: e.image?.url ? [ e.image.url ] : [],
			location: venue
				? {
					geoJSON: geoJSON,
					eventVenue: {
						name: venue.venue,
						address: {
							streetAddress: venue.address,
							addressLocality: venue.city,
							postalCode: venue.zip,
							addressCountry: venue.country
						},
						geo: {
							latitude: venue.geo_lat,
							longitude: venue.geo_lng
						}
					}
				}
				: source.defaultLocation || '',
		}
	};
}