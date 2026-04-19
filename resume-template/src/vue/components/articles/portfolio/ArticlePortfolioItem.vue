<template>
    <div class="portfolio-item"
         :class="`portfolio-item-${transitionStatus}`"
         @click="_onClick">
        <div class="portfolio-item-content-wrapper">
            <div class="portfolio-item-icon-wrapper">
                <IconView class="portfolio-icon-view"
                          ref="iconView"
                          :img="item?.img"
                          :fa-icon="item?.fallbackFaIcon"
                          :background-color="item?.fallbackFaIconColor"
                          :prioritize-image="true"
                          :transparency="!item"/>

                <div class="portfolio-item-thumb-overlay">
                    <div class="portfolio-item-thumb-overlay-content eq-h6">
                        <i class="fas fa-eye fa-2x"/>
                    </div>
                </div>
            </div>

            <div class="portfolio-item-description-wrapper">
                <button class="portfolio-item-title"
                        v-html="localize(item.locales, 'title')"/>

                <p class="portfolio-item-category"
                   v-html="categoryName"/>
            </div>
        </div>
    </div>
</template>

<script setup>
import {inject, onMounted, onUnmounted, ref, watch} from "vue"
import {useScheduler} from "/src/composables/scheduler.js"
import {useUtils} from "/src/composables/utils.js"
import IconView from "/src/vue/components/widgets/IconView.vue"

const scheduler = useScheduler()
const utils = useUtils()

const props = defineProps({
    /** @type {ArticleItem} **/
    item: {
        type: Object,
        required: true
    },
    categoryName: String,
    index: Number,
    transitionCount: Number
})

/** @type {Function} */
const localize = inject("localize")

/** @type {Function} */
const showProjectModal = inject("showProjectModal")

const transitionStatus = ref("hidden")
const iconView = ref(null)
const tag = utils.generateUniqueRandomString("portfolio-item")

onMounted(() => { _showAfterLoading() })
onUnmounted(() => { _hide() })
watch(() => props.transitionCount, () => { _showAfterLoading() })

const _hide = () => {
    transitionStatus.value = "hidden"
    scheduler.clearAllWithTag(tag)
}

const _showAfterLoading = () => {
    _hide()

    scheduler.interval(() => {
        const isLoading = iconView.value.imageView && iconView.value.imageView.isLoading()
        const hasImage = props.item.img
        if(!hasImage || !isLoading) {
            _show()
        }
    }, 1000/30, tag)
}

const _show = () => {
    scheduler.clearAllWithTag(tag)

    const timeout = 30 + (props.index || 0) * 60
    scheduler.schedule(() => {
        transitionStatus.value = "showing"
    }, timeout, tag)

    scheduler.schedule(() => {
        transitionStatus.value = "shown"
        scheduler.clearAllWithTag(tag)
    }, timeout + 350, tag)
}

const _onClick = () => {
    showProjectModal(props.item)
}
</script>

<style lang="scss" scoped>
@import "/src/scss/_theming.scss";

div.portfolio-item {
    display: flex;
    align-items: stretch;
    justify-content: flex-start;

    width: 100%;
    height: 100%;
    background-color: darken($default-section-background, 1%);
    border-radius: 24px;
    border: 1px solid rgba($dark, 0.06);
    box-shadow: 0 8px 24px rgba($dark, 0.06);
    @include media-breakpoint-down(sm) {
        border-radius: 16px;
    }
}

/** ----------------- TRANSITIONS ------------------- **/
div.portfolio-item-hidden {
    opacity: 0;
}

div.portfolio-item-showing {
    animation: appear 0.3s ease-out forwards;
}

@keyframes appear {
    from {
        opacity:0;
        transform: scale(0.8) translateY(30%);
    }
    to {
        opacity:1
    }
}

/** ------------------- CONTENT ---------------------- **/
div.portfolio-item-content-wrapper {
    --proportion: 1;
    --base-icon-size: 84px;
    --base-title-size: 20px;

    @include media-breakpoint-down(xxl) {
        --base-title-size: 19px;
    }
    @include media-breakpoint-down(md) {
        --base-title-size: 18px;
    }
    @include media-breakpoint-down(sm) {
        --base-icon-size: 72px;
        --base-title-size: 17px;
    }

    display: flex;
    align-items: center;
    gap: 18px;
    width: 100%;
    cursor: pointer;
    margin: 22px;

    div.portfolio-item-icon-wrapper {
        position: relative;
        flex: 0 0 auto;
        margin: 0;
        cursor: pointer;
        overflow: hidden;
        user-select: none;
        pointer-events: none;
        border-radius: 20px;
        aspect-ratio: 1/1;
        width: calc(var(--base-icon-size) * var(--proportion));
        height: calc(var(--base-icon-size) * var(--proportion));
    }

    div.portfolio-icon-view {
        font-size: calc(var(--base-icon-size)/2.1 * var(--proportion));
    }

    div.portfolio-item-thumb-overlay {
        position: absolute;
        top: 0;
        opacity: 0;

        display: flex;
        align-items: center;
        justify-content: center;

        width: 100%;
        height: 100%;
        border-radius: 20px;

        background: fade-out(lighten($primary, 5%), 0.1);
        transition: all ease-in-out 0.25s;

        &-content {
            color: $white;
        }
    }

    div.portfolio-item-description-wrapper {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        text-align: left;
        flex: 1 1 auto;
        min-width: 0;
    }

    button.portfolio-item-title {
        border: none;
        padding: 0;
        background-color: transparent;
        color: $dark;
        font-weight: bold;
        font-size: calc(var(--base-title-size) * var(--proportion));
        line-height: 1.3;
        margin-bottom: 6px;
        text-align: left;
    }

    p.portfolio-item-category {
        padding: 0;
        color: $light-7!important;
        font-size: 0.95rem;
        margin: 0;
        text-align: left;
    }

    @include media-breakpoint-down(sm) {
        align-items: flex-start;
        gap: 14px;
        margin: 16px;
    }
}

div.portfolio-item-content-wrapper:hover {
    div.portfolio-item-thumb-overlay {
        opacity: 1;
    }

    button.portfolio-item-title {
        color: lighten($primary, 10%);
        transition: color ease-in-out 0.3s;
    }
}
</style>