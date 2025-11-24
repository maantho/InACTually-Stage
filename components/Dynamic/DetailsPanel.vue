
<!--
	InACTually
	> interactive theater for actual acts
	> this file is part of the "InACTually Stage", a spatial Interface for orchestrating interactive Media

	Copyright (c) 2023–2025 Fabian Töpfer, Lars Engeln
	Copyright (c) 2025 InACTually Community
	Licensed under the MIT License.
	See LICENSE file in the project root for full license information.

	This file is created and substantially modified: 2024-2025

	contributors:
	Fabian Töpfer - baniaf@uber.space
	Lars Engeln - mail@lars-engeln.de
    Anton Hörig - dev@antonhoerig.de
-->

<template>
    <DynamicPanelBase v-model="expand">
        <template v-slot:title>
            <h6>Object</h6>
        </template>
        <template v-slot:content>
                <div v-if="selectedRoomNode" >
                    <CommonPanelRow class="input_row" v-if="name" > 
                        <CommonInput class="input" v-model="name" type="text" @onUserInput="updateName()"></CommonInput>
                    </CommonPanelRow>

                    <CommonPanelRow class="input_row" v-if="pos" > 
                        <h6>POS</h6>
                        <CommonInput class="input" v-model="pos.x" labelText="" type="number" @onUserChange="updatePosition()"></CommonInput>
                        <CommonInput class="input" v-model="pos.y" labelText="" type="number" @onUserChange="updatePosition()"></CommonInput>
                        <CommonInput class="input" v-model="pos.z" labelText="" type="number" @onUserChange="updatePosition()"></CommonInput>
                    </CommonPanelRow>
                    <CommonPanelRow class="input_row" v-if="rot"> 
                        <h6>ROT</h6>
                        <CommonInput class="input" v-model="rot.x" labelText="" type="number" @onUserChange="updateRotation()"></CommonInput>
                        <CommonInput class="input" v-model="rot.y" labelText="" type="number" @onUserChange="updateRotation()"></CommonInput>
                        <CommonInput class="input" v-model="rot.z" labelText="" type="number" @onUserChange="updateRotation()"></CommonInput>
                    </CommonPanelRow>
              
                    <DynamicRoomNodesMovingHeadDetailsPanel 
                        v-if="(selectedRoomNode as RoomNodeBase).getRoomNodeType() === RoomNodeType.RNT_MOVINGHEAD" 
                        :selectedRoomNode="(selectedRoomNode as MovingHeadRoomNode)">
                    </DynamicRoomNodesMovingHeadDetailsPanel>

                    <DynamicRoomNodesProjectorDetailsPanel
                        v-if="(selectedRoomNode as RoomNodeBase).getRoomNodeType() === RoomNodeType.RNT_PROJECTOR" 
                        :selectedRoomNode="(selectedRoomNode as ProjectorRoomNode)">
                    </DynamicRoomNodesProjectorDetailsPanel>

                    <DynamicRoomNodesActionSpaceDetailsPanel 
                        v-if="(selectedRoomNode as RoomNodeBase).getRoomNodeType() === RoomNodeType.RNT_ACTIONSPACE" 
                        :selectedRoomNode="(selectedRoomNode as ActionSpaceRoomNode)">
                    </DynamicRoomNodesActionSpaceDetailsPanel>
      
      
                    <CommonPanelRow class="input_row">
                        <h6 @click="deleteRoomNode()">DELETE</h6>
                    </CommonPanelRow>

                </div>
        </template>
    </DynamicPanelBase>   
</template>
<script setup lang="ts">
import RoomManager from '~/app/RoomManager';
import * as THREE from "three";
import { RoomNodeType, fromRoomNodeType } from '~/app/RoomNodes/RoomNodeRegistry';
import  RoomNodeBase from '~/app/RoomNodes/RoomNodeBase';
import type MovingHeadRoomNode from '~/app/RoomNodes/DMX/MovingHeadRoomNode';
import type ActionSpaceRoomNode from '~/app/RoomNodes/ActionSpace/ActionSpaceRoomNode';
import type ProjectorRoomNode from '~/app/RoomNodes/Projector/ProjectorRoomNode';

const props = defineProps({
    selectedRoomNode:{
        required:true
    },
    roomManager:{
        type:RoomManager,
        required:true
    }
});

let expand = ref<boolean>(true); 

let name = ref<string>("");

let pos = ref<THREE.Vector3>(new THREE.Vector3());
let rot =  ref<THREE.Euler>(new THREE.Euler());

const rawSelectedRoomNode = computed(()=>{
    return toRaw(props.selectedRoomNode) as RoomNodeBase
})


onMounted(()=>{

    watch(rawSelectedRoomNode,()=>{
        if(rawSelectedRoomNode.value){
            watch(rawSelectedRoomNode.value.getObject3D().position,()=>{ 
            setPosition();
            },{immediate:true})
            watch(rawSelectedRoomNode.value.getObject3D().quaternion,()=>{ 
                setRotation();
            },{immediate:true})
            watch(rawSelectedRoomNode.value.getName(),()=>{ 
                setName();
            },{immediate:true})
            expand.value = true;
        }
    },{immediate:true})    

    
});

function deleteRoomNode(){
    if(rawSelectedRoomNode.value){
        props.roomManager.deleteRoomNodeByUID(rawSelectedRoomNode.value.getRoomNodeType(),rawSelectedRoomNode.value.getUID(),true);
    }
    expand.value = false;
}

/*************          NAME          *********/

function setName(){
    name.value = rawSelectedRoomNode.value.getName().value;
}

watch(()=>name.value,(newValue:any,oldValue:any)=>{
    if(newValue == ""){
        newValue = oldValue;
    }
    name.value = newValue
})

function updateName(){
    rawSelectedRoomNode.value.setName(name.value);
}

/*************          POSITION          *********/

function setPosition(){
    pos.value = rawSelectedRoomNode.value.getObject3D().position.clone();
}

watch(()=>pos.value.x,(newValue:any,oldValue:any)=>{
    if(isNaN(Number(newValue))){
        newValue = oldValue;
    }
    pos.value.x = Number(newValue.toFixed(2));
})
watch(()=>pos.value.y,(newValue:any,oldValue:any)=>{
    if(isNaN(Number(newValue))){
         newValue = oldValue;
    }
    pos.value.y = Number(newValue.toFixed(2));
})
watch(()=>pos.value.z,(newValue:any,oldValue:any)=>{
    if(isNaN(Number(newValue))){
        newValue = oldValue;
    }
    pos.value.z = Number(newValue.toFixed(2));
})

function updatePosition(){
    rawSelectedRoomNode.value.setPosition(pos.value.x,pos.value.y,pos.value.z);
}


/*************          ROTATION            *********/

function setRotation(){
    let radRot = rawSelectedRoomNode.value.getObject3D().rotation.clone();
        
        rot.value.x = Number(THREE.MathUtils.radToDeg(radRot.x).toFixed(2));
        rot.value.y = Number(THREE.MathUtils.radToDeg(radRot.y).toFixed(2));
        rot.value.z = Number(THREE.MathUtils.radToDeg(radRot.z).toFixed(2));

}
watch(()=>rot.value.x,(newValue:any,oldValue:any)=>{
    if(isNaN(Number(newValue))){
        newValue = oldValue;
    }
    rot.value.x = Number(newValue.toFixed(2));
})
watch(()=>rot.value.y,(newValue:any,oldValue:any)=>{
    if(isNaN(Number(newValue))){
        newValue = oldValue;
    }
    rot.value.y = Number(newValue.toFixed(2));
})
watch(()=>rot.value.z,(newValue:any,oldValue:any)=>{
    if(isNaN(Number(newValue))){
        newValue = oldValue;
    }
    rot.value.z = Number(newValue.toFixed(2));
})

function updateRotation(){    
    rawSelectedRoomNode.value.setRotationDegree(rot.value.x,rot.value.y,rot.value.z);
}

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
