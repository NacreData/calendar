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
const eventURL = props.event.event.url;
const eventID = props.event.event.id;
const eventLocation = props.event.event.extendedProps.location;
const eventDescription = replaceBadgePlaceholders(sanitizeHtml(props.event.event.extendedProps.description));
const eventImages = props.event.event.extendedProps.images || [];
const eventTags = props.event.event.extendedProps.tags;

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
    <!-- Display Event Details -->
    <div class="event-details">
      <span class="event-headers">Event Title:</span> <span v-html="eventTitle"></span><br>
      <span class="event-headers">Event Time:</span> {{ eventTime }}<br>
      <span v-if="eventHost"> <span class="event-headers">Event Host:</span> {{ eventHost }}<br> </span>
      <span class="event-headers">Event Location:</span> <a :href="createGoogleMapsURL(eventLocation)" target="_blank">{{ eventLocation }}</a><br>
      <!-- Display Images -->
      <div class="image-container">
        <div 
          class="image-wrapper"
          v-for="(url, index) in getImageUrls()" 
          :key="index"
        >
          <!-- Check if there's an error message for this image, if so, display the message instead of image -->
          <div v-if="errorMessages[index]">
            {{ errorMessages[index] }}
          </div>   
          <!-- If there's no error message, render the image as usual --> 
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
      <span class="event-headers">Event Description:</span> <div v-html="eventDescription"></div><br>
    </div>

    <!-- Dev-only debug info -->
    <div v-if="isDevelopment" class="dev-info">
      <span class="dev-label">Dev Only</span>
      <dl class="dev-fields">
        <template v-if="eventID">
          <dt>Event ID</dt>
          <dd>{{ eventID }}</dd>
        </template>
        <dt>Event Images</dt>
        <dd>{{ eventImages }}</dd>
        <dt>Tags</dt>
        <dd>{{ eventTags }}</dd>
        <dt>Event URL</dt>
        <dd><a :href="eventURL" target="_blank">{{ eventURL }}</a></dd>
      </dl>
      <details class="dev-raw">
        <summary>Raw Event JSON</summary>
        <pre>{{ JSON.stringify(props.event.event.extendedProps, null, 2) }}</pre>
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