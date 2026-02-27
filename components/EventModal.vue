<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal'
import sanitizeHtml from 'sanitize-html';
import { replaceBadgePlaceholders } from '~~/utils/util';

const props = defineProps<{
    event: any // Declare the event prop here
}>()
const emit = defineEmits<{
	(e: 'confirm'): void
}>()

// Development environment flag
const isDevelopment = process.env.NODE_ENV === 'development';

// Constants that are used for storing shorthand event information
const rawEventTitle = props.event.event.title;
const eventTitle = replaceBadgePlaceholders(rawEventTitle);
const eventTime = props.event.event.start.toLocaleDateString() + ' @ ' + 
                  props.event.event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
const eventHost = props.event.event.extendedProps.org;
const eventOrganizer = props.event.event.extendedProps.organizer;
const eventURL = props.event.event.url;
const eventID = props.event.event.id;
const rawLocation = props.event.event.extendedProps.location;
const eventLocation = formatLocation(rawLocation);

function formatLocation(loc) {
  if (!loc) return '';
  if (typeof loc === 'string') return loc;
  const venue = loc.eventVenue;
  if (!venue) return '';
  return [venue.name, venue.address?.streetAddress, venue.address?.addressLocality].filter(Boolean).join(', ');
}
const eventDescription = replaceBadgePlaceholders(sanitizeHtml(props.event.event.extendedProps.description));
const eventImages = props.event.event.extendedProps.images || [];
const eventTags = props.event.event.extendedProps.tags;
const parsedExtendedProps = JSON.stringify(
  Object.fromEntries(Object.entries(props.event.event.extendedProps).filter(([k]) => k !== 'raw')),
  null, 2
);

//For interpreting the location into a google maps recognizable address
function createGoogleMapsURL(location) {
  const encodedLocation = encodeURIComponent(location); // Encode the location string to make it URL-friendly
  const googleMapsURL = `https://www.google.com/maps/search/?q=${encodedLocation}`; // Make the Google Maps URL with the location as the parameter
  return googleMapsURL;
}

// Function to extract image urls from the eventDescription and construct a new URL
// pointing towards your serverless function
const getImageUrls = () => {
  return eventImages.slice(0,3).map(url => `/api/fetchImage?url=${encodeURIComponent(url)}`);
};

let errorMessages = ref([]); // To store error messages relating to image display

const handleImageError = (index) => {
  errorMessages.value[index] = `Failed to load image at ${index + 1}. This might be caused by an invalid image URL, or the image size is larger than 5MB.`;
};

// For displaying multiple images
const getImageClass = (index) => {
  const classes = ['single', 'double', 'triple'];
  return classes[index] || '';
};
</script>

<template>
  <VueFinalModal class="popper-box-wrapper" content-class="popper-box-inner" overlay-transition="vfm-fade" content-transition="vfm-fade">
    <!-- Event Header -->
    <div class="event-header">
      <h1 v-html="eventTitle"></h1>
      <div class="event-meta">
        <span>{{ eventTime }}</span>
        <span v-if="eventLocation"> · <a :href="createGoogleMapsURL(eventLocation)" target="_blank">{{ eventLocation }}</a></span>
      </div>
    </div>

    <!-- Display Images -->
    <div v-if="getImageUrls().length" class="image-container">
      <div
        class="image-wrapper"
        v-for="(url, index) in getImageUrls()"
        :key="index"
      >
        <div v-if="errorMessages[index]">
          {{ errorMessages[index] }}
        </div>
        <img
          class="event-image"
          v-else
          :src="url"
          :class="getImageClass(index)"
          @error="handleImageError(index)"
          alt="Image found within the description of this calendar event"
        />
      </div>
    </div>

    <!-- Display Event Details -->
    <div class="event-details">
      <div v-if="eventHost" class="event-field">
        <span class="event-headers">Event Host:</span> {{ eventHost }}
      </div>
      <div class="event-field">
        <span class="event-headers">Description:</span>
        <div v-if="eventDescription" v-html="eventDescription"></div>
        <div v-else class="no-description"><em>No description provided</em></div>
      </div>
      <div v-if="eventOrganizer" class="event-field">
        <span class="event-headers">Organizer:</span><br/>
        <div v-html="eventOrganizer" />
      </div>
    </div>

    <!-- Dev-only debug info -->
    <div v-if="isDevelopment" class="dev-info">
      <span class="dev-label">Dev Only</span>
      <details class="dev-raw">
        <summary>Parsed JSON</summary>
        <pre>{{ parsedExtendedProps }}</pre>
      </details>
      <details class="dev-raw">
        <summary>Raw Event JSON</summary>
        <pre>{{ props.event.event.extendedProps.raw || JSON.stringify(props.event.event.extendedProps, null, 2) }}</pre>
      </details>
    </div>

    <!-- Add a "Done" button -->
    <div class="bottom">
      <button @click="emit('confirm')">
        Done
      </button>
    </div>
  </VueFinalModal>
</template>

<style scoped>
.event-header {
  position: sticky;
  top: -1rem;
  background: var(--background-alt);
  padding-top: 1rem;
  padding-bottom: 8px;
  margin-bottom: 4px;
  border-bottom: 1px solid #e0e0e0;
  z-index: 1;
}

.event-header h1 {
  margin: 0 0 4px;
  font-size: 1.7rem;
  text-align: center;
}

.event-meta {
  color: #666;
  font-size: 0.9em;
  text-align: center;
}

.image-container {
  margin-bottom: 16px;
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fafafa;
}

.event-details {
  margin-bottom: 8px;
}

.event-field {
  margin-bottom: 8px;
}

.no-description {
  color: #999;
}

.dev-info {
  margin-top: 12px;
  padding: 8px;
  border: 1px dashed #999;
  border-radius: 4px;
  font-size: 0.9em;
  opacity: 0.8;
}

.dev-label {
  display: inline-block;
  background-color: #f0ad4e;
  color: #fff;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.75em;
  font-weight: bold;
  margin-bottom: 6px;
}

.dev-fields {
  margin: 4px 0 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px 8px;
}

.dev-fields dt {
  font-weight: bold;
}

.dev-fields dd {
  margin: 0;
  word-break: break-all;
}

.dev-raw {
  margin-top: 8px;
}

.dev-raw pre {
  margin: 4px 0 0;
  padding: 8px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 0.85em;
  max-height: 300px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>