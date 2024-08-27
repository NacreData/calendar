import eventSourcesJSON from '@/assets/event_sources.json';
import { logTimeElapsedSince, serverCacheMaxAgeSeconds, serverStaleWhileInvalidateSeconds, serverFetchHeaders } from '~~/utils/util';

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
				events: wpEvents.map(convertWordpressTribeEventToFullCalendarEvent),
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

// The following conversion function is basically ripped from anarchism.nyc.
function convertWordpressTribeEventToFullCalendarEvent(e) {
	var geoJSON = (e.venue.geo_lat && e.venue.geo_lng)
		? {
			type: "Point",
			coordinates: [e.venue.geo_lng, e.venue.geo_lat]
		}
		: null;
	return {
		title: e.title,
		start: new Date(e.utc_start_date + 'Z'),
		end: new Date(e.utc_end_date + 'Z'),
		url: e.url,
		extendedProps: {
			description: e.description,
			image: e.image.url,
			location: {
				geoJSON: geoJSON,
				eventVenue: {
					name: e.venue.venue,
					address: {
						streetAddress: e.venue.address,
						addressLocality: e.venue.city,
						postalCode: e.venue.zip,
						addressCountry: e.venue.country
					},
					geo: {
						latitude: e.venue.geo_lat,
						longitude: e.venue.geo_lng
					}
				}
			}
		}
	};
}