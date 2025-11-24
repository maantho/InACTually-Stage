<!--
	InACTually
	> interactive theater for actual acts
	> this file is part of the "InACTually Stage", a spatial Interface for orchestrating interactive Media

	Copyright(c) 2025 InACTually Community
	Licensed under the MIT License.
	See LICENSE file in the project root for full license information.

	This file is created and substantially modified: 2025

	contributors:
	Anton Hörig - dev@antonhoerig.de
-->

<template>
    <CommonPanelRow class="input_row">
        <h6>Resolution</h6>
        <CommonInput class="input" v-model="resolution.x" labelText="" type="number" @onUserChange="updateResolution()" />
        <CommonInput class="input" v-model="resolution.y" labelText="" type="number" @onUserChange="updateResolution()" />
    </CommonPanelRow>
    <CommonPanelRow class="input_row">
        <h6>Focal Length / Pixel</h6>
        <CommonInput class="input" v-model="focalLengthPixel.x" labelText="" type="number" @onUserChange="updateFocalLengthPixel()" />
        <CommonInput class="input" v-model="focalLengthPixel.y" labelText="" type="number" @onUserChange="updateFocalLengthPixel()" />
    </CommonPanelRow>
    <CommonPanelRow class="input_row">
        <h6>Skew</h6>
        <CommonInput class="input" v-model="skew" labelText="" type="number" @onUserChange="updateSkew()" />
    </CommonPanelRow>
    <CommonPanelRow class="input_row">
        <h6>Principal Point</h6>
        <CommonInput class="input" v-model="principalPoint.x" labelText="" type="number" @onUserChange="updatePrincipalPoint()" />
        <CommonInput class="input" v-model="principalPoint.y" labelText="" type="number" @onUserChange="updatePrincipalPoint()" />
    </CommonPanelRow>
    <CommonPanelRow class="input_row" @click="updateIsCalibrating()">
        <h6>Listen for Correspondences.....</h6>
        <h6>{{isCalibrating}}</h6>
    </CommonPanelRow>
    <CommonPanelRow class="input_row" @click="resetCorrespondences()">
        <h6>Reset Correspondences</h6>
    </CommonPanelRow>
    <CommonPanelRow class="input_row">
        <h6>Test Object Point</h6>
        <CommonInput class="input" v-model="testObjectPoint.x" labelText="" type="number" />
        <CommonInput class="input" v-model="testObjectPoint.y" labelText="" type="number" />
        <CommonInput class="input" v-model="testObjectPoint.z" labelText="" type="number" />
    </CommonPanelRow>
    <CommonPanelRow class="input_row" @click="publishTestObjectPoint()">
        <h6>Publish Test Object Point</h6>
    </CommonPanelRow>
</template>
<script lang="ts" setup>
import { update } from "@tweenjs/tween.js";
import * as THREE from "three"
import ProjectorRoomNode from "~/app/RoomNodes/Projector/ProjectorRoomNode";

const props = defineProps({
    selectedRoomNode: {
        required: true,
        type: ProjectorRoomNode
    },
});

let resolution = ref<{ x: number, y: number }>({ x: 1920, y: 1080 });
let isCalibrating = ref<boolean>(false);
let focalLengthPixel = ref<{ x: number, y: number }>({ x: 1, y: 1 });
let skew = ref<number>(0);
let principalPoint = ref<{ x: number, y: number }>({ x: 0, y: 0 });
let testObjectPoint = ref<{ x: number, y: number, z: number }>({ x: 0, y: 0 , z: 0 });

const rawSelectedRoomNode = computed(() => {
    return toRaw(props.selectedRoomNode);
})

onMounted(() => {
    watch(rawSelectedRoomNode, () => {
        if (rawSelectedRoomNode.value) {
            // Whatch Node & issue UI change
            watch(rawSelectedRoomNode.value.getResolution(), () => {
                setResolution();
            }, { immediate: true })
            watch(rawSelectedRoomNode.value.getIsCalibrating(), () => {
                setIsCalibrating();
            }, { immediate: true })
            watch(rawSelectedRoomNode.value.getFocalLengthPixel(), () => {
                setFocalLengthPixel();
            }, { immediate: true })
            watch(rawSelectedRoomNode.value.getSkew(), () => {
                setSkew();
            }, { immediate: true })
            watch(rawSelectedRoomNode.value.getPrincipalPoint(), () => {
                setPrincipalPoint();
            }, { immediate: true })

        }
    }, { immediate: true })
})

/*************          Resolution          *********/
// From Node To UI
function setResolution() {
    const res = rawSelectedRoomNode.value.getResolution().value;
    resolution.value = { x: res.x, y: res.y };
}

//From UI to Node
function updateResolution() {
    rawSelectedRoomNode.value.setResolution({ x: resolution.value.x, y: resolution.value.y });
}

// Validate UI changes
watch(() => resolution.value.x, (newValue: any, oldValue: any) => {
    if (isNaN(Number(newValue))) {
        newValue = oldValue;
    }
    resolution.value.x = Number(newValue.toFixed(0));
})
watch(() => resolution.value.y, (newValue: any, oldValue: any) => {
    if (isNaN(Number(newValue))) {
        newValue = oldValue;
    }
    resolution.value.y = Number(newValue.toFixed(0));
})

//*************          Focal Length Pixel          *********/
// From Node To UI
function setFocalLengthPixel() {
    const tmp = rawSelectedRoomNode.value.getFocalLengthPixel().value;
    focalLengthPixel.value = { x: tmp.x, y: tmp.y };
}

//From UI to Node
function updateFocalLengthPixel() {
    rawSelectedRoomNode.value.setFocalLengthPixel({ x: focalLengthPixel.value.x, y: focalLengthPixel.value.y });
}

// Validate UI changes
watch(() => focalLengthPixel.value.x, (newValue: any, oldValue: any) => {
    if (isNaN(Number(newValue))) {
        newValue = oldValue;
    }
    focalLengthPixel.value.x = Number(newValue.toFixed(2));
})
watch(() => focalLengthPixel.value.y, (newValue: any, oldValue: any) => {
    if (isNaN(Number(newValue))) {
        newValue = oldValue;
    }
    focalLengthPixel.value.y = Number(newValue.toFixed(2));
})

//*************          Skew          *********/
// From Node To UI
function setSkew() {
    skew.value = rawSelectedRoomNode.value.getSkew().value;
}

//From UI to Node
function updateSkew() {
    rawSelectedRoomNode.value.setSkew(skew.value);
}

// Validate UI changes
watch(skew, (newValue: number, oldValue: number) => {
    if (isNaN(Number(newValue))) {
        newValue = oldValue;
    }
    skew.value = Number(newValue.toFixed(2));
})

//*************          Principal Point          *********/
// From Node To UI
function setPrincipalPoint() {
    const tmp = rawSelectedRoomNode.value.getPrincipalPoint().value;
    principalPoint.value = { x: tmp.x, y: tmp.y };
}

//From UI to Node
function updatePrincipalPoint() {
    rawSelectedRoomNode.value.setPrincipalPoint({ x: principalPoint.value.x, y: principalPoint.value.y });
}

// Validate UI changes
watch(() => principalPoint.value.x, (newValue: any, oldValue: any) => {
    if (isNaN(Number(newValue))) {
        newValue = oldValue;
    }
    principalPoint.value.x = Number(newValue.toFixed(2));
})
watch(() => principalPoint.value.y, (newValue: any, oldValue: any) => {
    if (isNaN(Number(newValue))) {
        newValue = oldValue;
    }
    principalPoint.value.y = Number(newValue.toFixed(2));
})

/*************          IsCalibrating          *********/
// From Node To UI
function setIsCalibrating() {
    isCalibrating.value = rawSelectedRoomNode.value.getIsCalibrating().value;
}

//From UI to Node
function updateIsCalibrating() {
    isCalibrating.value = !isCalibrating.value;
    rawSelectedRoomNode.value.setIsCalibrating(isCalibrating.value);
}

/*************          Reset Correspondences          *********/
function resetCorrespondences() {
    rawSelectedRoomNode.value.resetCorrespondences();
}

/*************          Test Object Point          *********/
function publishTestObjectPoint() {
    rawSelectedRoomNode.value.publishObjectPoint(testObjectPoint.value);
}

watch(() => testObjectPoint.value.x, (newValue: any, oldValue: any) => {
    if (isNaN(Number(newValue))) {
        newValue = oldValue;
    }
    testObjectPoint.value.x = Number(newValue.toFixed(2));
})

watch(() => testObjectPoint.value.y, (newValue: any, oldValue: any) => {
    if (isNaN(Number(newValue))) {
        newValue = oldValue;
    }
    testObjectPoint.value.y = Number(newValue.toFixed(2));
})

watch(() => testObjectPoint.value.z, (newValue: any, oldValue: any) => {
    if (isNaN(Number(newValue))) {
        newValue = oldValue;
    }
    testObjectPoint.value.z = Number(newValue.toFixed(2));
})

</script>
<style scoped lang="scss">
@use "@/assets/style/vars.scss";

.input_row{
    display:flex;
    flex-direction: row;
    justify-content:center;
    align-items:center;

    .input{
        margin:3px;
    }
}

</style>
