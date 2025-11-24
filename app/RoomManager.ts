
/*
	InACTually
	> interactive theater for actual acts
	> this file is part of the "InACTually Stage", a spatial Interface for orchestrating interactive Media

	Copyright(c) 2023–2025 Fabian Töpfer, Lars Engeln
	Copyright(c) 2025 InACTually Community
	Licensed under the MIT License.
	See LICENSE file in the project root for full license information.

	This file is created and substantially modified: 2023-2025

	contributors:
	Fabian Töpfer - baniaf@uber.space
	Lars Engeln - mail@lars-engeln.de
	Anton Hörig - dev@antonhoerig.de
*/

import type RoomNodeBase from "./RoomNodes/RoomNodeBase";
import RoomNodeManagerBase from "./RoomNodes/RoomNodeManagerBase";
import roomNodeCorrespondence, { RoomNodeManagerType, RoomNodeType } from "./RoomNodes/RoomNodeRegistry";
import * as THREE from "three";
import Stage from "./View3D/Stage";
import type IRoomNodePublisher from "./Network/IRoomNodePublisher";
import ActionSpaceManager from "./RoomNodes/ActionSpace/ActionSpaceManager";
import CameraManager from "./RoomNodes/Camera/CameraManager";
import KinectManager from "./RoomNodes/Kinect/KinectManager";
import DMXManager from "./RoomNodes/DMX/DMXManager";
import { ProjectionPos } from "./View3D/ProjectionManager";
import BodyManager from "./RoomNodes/Body/BodyManager";
import ProjectorManager from "./RoomNodes/Projector/ProjectorManager";

export interface IRoomNodeManagers {
	getRoomNodeMgrByRoomNodeType(type: RoomNodeType): RoomNodeManagerBase | undefined
}

export default class RoomManager {

	private m_roomNodeManagers = [] as RoomNodeManagerBase[];
	private m_container3D = new THREE.Object3D();
	private m_publisher = {} as IRoomNodePublisher;

	private m_actionSpaceManager = {} as ActionSpaceManager;
	private m_cameraManager = {} as CameraManager;
	private m_kinectManager = {} as KinectManager;
	private m_dmxManager = {} as DMXManager;
	private m_bodyManager = {} as BodyManager;
	private m_projectorManager = {} as ProjectorManager;

	public stage = {} as Stage;

	public deselectSelectedRoomNode = () => { };

	constructor(publisher: IRoomNodePublisher) {
		this.setup(publisher);
	}

	public setup(publisher: IRoomNodePublisher): void {
		this.stage = new Stage(this.m_container3D);

		this.m_publisher = publisher
		this.setupRoomNodeManagers();
	}

	public update() {
		this.m_roomNodeManagers.forEach((mgr: RoomNodeManagerBase) => mgr.update());
		this.stage.update();
	}

	private setupRoomNodeManagers() {

		this.m_actionSpaceManager = new ActionSpaceManager(this.m_publisher, this, this.stage.roomModelManager);
		this.m_cameraManager = new CameraManager(this.m_publisher, this, this.stage.roomModelManager);
		this.m_kinectManager = new KinectManager(this.m_publisher, this, this.stage.roomModelManager);
		this.m_dmxManager = new DMXManager(this.m_publisher, this, this.stage.roomModelManager);
		this.m_bodyManager = new BodyManager(this.m_publisher, this, this.stage.roomModelManager);
		this.m_projectorManager = new ProjectorManager(this.m_publisher, this, this.stage.roomModelManager);

		this.m_roomNodeManagers.push(this.m_actionSpaceManager);
		this.m_roomNodeManagers.push(this.m_cameraManager);
		this.m_roomNodeManagers.push(this.m_kinectManager);
		this.m_roomNodeManagers.push(this.m_dmxManager);
		this.m_roomNodeManagers.push(this.m_bodyManager);
		this.m_roomNodeManagers.push(this.m_projectorManager);

		this.m_roomNodeManagers.forEach((rnm) => {
			this.m_container3D.add(rnm.getContainer3D());
		});
	}

	public draw(canvas: HTMLElement, onUpdateCB: () => void): void {
		if (this.stage)
			this.stage.draw(
				canvas,
				() => {
					onUpdateCB();
				}
			);
	}

	public onResize() {
		this.stage.onResize();
	}

	public getRoomNodeByUID(uid: string): RoomNodeBase | undefined {
		var node;
		this.m_roomNodeManagers.some((rnm: RoomNodeManagerBase) => {
			node = rnm.getRoomNodeByUID(uid);
			return node !== undefined; // breaks "some" if true
		});
		return node;
	}

	public getRoomNodeMgrByRoomNodeType(type: RoomNodeType): RoomNodeManagerBase | undefined {
		let roomNodeManagerType = roomNodeCorrespondence.get(type);
		let mgr = undefined;

		this.m_roomNodeManagers.some((rnm: RoomNodeManagerBase) => {
			if (rnm.getRoomNodeMgrType() === roomNodeManagerType) {
				mgr = rnm;
				return true; // breaks "some"
			}
			return false;
		});
		return mgr;
	}

	public getAllRoomNodes(): RoomNodeBase[][] {
		let roomNodes = [] as RoomNodeBase[][];
		this.m_roomNodeManagers.forEach((rnm: RoomNodeManagerBase) => {
			roomNodes.push(rnm.getRoomNodes());
		})
		return roomNodes;
	}

	public createRoomNodeByType(type: RoomNodeType, uid?: string, position: THREE.Vector3 = new THREE.Vector3(0, 1, 0), orientation: THREE.Quaternion = new THREE.Quaternion(), params?: any): RoomNodeBase | undefined {
		let roomNodeManager = this.getRoomNodeMgrByRoomNodeType(type);
		if (roomNodeManager === undefined) {
			return undefined;
		}
		return roomNodeManager.createRoomNode(uid, position, orientation, params);
	}

	public updateRoomNodeByUID(uid: string, data: any, publish: boolean): RoomNodeBase | undefined {
		let roomNode = this.getRoomNodeByUID(uid);

		if (roomNode === undefined) {
			return undefined;
		}
		roomNode.fromJson(data, publish);

		return roomNode;
	}

	public deleteRoomNodeByUID(type: RoomNodeType, uid: string, publish: boolean): RoomNodeBase | undefined {
		let roomNodeManager = this.getRoomNodeMgrByRoomNodeType(type);
		if (roomNodeManager == undefined) {
			return undefined;
		}

		let roomNode = roomNodeManager.getRoomNodeByUID(uid);
		if (roomNode) {
			if (roomNode.getIsSelected())
				this.deselectSelectedRoomNode();
		}

		return roomNodeManager.deleteRoomNode(uid, publish);
	}

	public onClick(raycaster: THREE.Raycaster): { roomNode: RoomNodeBase, obj3D: THREE.Object3D, distance: number }[] {
		let intersections = [] as { roomNode: RoomNodeBase, obj3D: THREE.Object3D, distance: number }[];
		for (let i = 0; i < this.m_roomNodeManagers.length; i++) {
			intersections = [...intersections, ...this.m_roomNodeManagers[i].hit(raycaster)];
		}
		intersections.sort((a, b) => a.distance - b.distance);
		return intersections;
	}

	public onHover(raycaster: THREE.Raycaster): { roomNode: RoomNodeBase, obj3D: THREE.Object3D, distance: number }[] {
		let intersections = [] as { roomNode: RoomNodeBase, obj3D: THREE.Object3D, distance: number }[];
		for (let i = 0; i < this.m_roomNodeManagers.length; i++) {
			intersections = [...intersections, ...this.m_roomNodeManagers[i].hit(raycaster)];
		}
		intersections.sort((a, b) => a.distance - b.distance);
		return intersections;
	}

	public onDragStart(raycaster: THREE.Raycaster) { }

	public onDragEnd(raycaster: THREE.Raycaster) { }

	public onRoomNodeChanged(roomNode: RoomNodeBase, onstart: Boolean) {
		this.m_actionSpaceManager.onRoomNodeChanged(roomNode, onstart);
	}

	public onCameraChanged() {
		// this.m_actionSpaceManager.onRoomNodeChanged(roomNode, onstart);
		this.stage.projectionManager.setProjectionPos(ProjectionPos.NONE);
	}
	public toJson(): any { }

	public fromJson(json: any): void {
		if (json.cameraManager)
			this.m_cameraManager.fromJson(json.cameraManager);

		if (json.kinectManager)
			this.m_kinectManager.fromJson(json.kinectManager);

		if (json.dmxManager)
			this.m_dmxManager.fromJson(json.dmxManager);

		if (json.actionSpaceManager)
			this.m_actionSpaceManager.fromJson(json.actionSpaceManager);

		if (json.projectorManager)
			this.m_projectorManager.fromJson(json.projectorManager);
	}
}
