
/*
	InACTually
	> interactive theater for actual acts
	> this file is part of the "InACTually Stage", a spatial Interface for orchestrating interactive Media

	Copyright(c) 2025 InACTually Community
	Licensed under the MIT License.
	See LICENSE file in the project root for full license information.

	This file is created and substantially modified: 2025

	contributors:
	Lars Engeln - mail@lars-engeln.de
	Anton Hörig - dev@antonhoerig.de
*/

import loadModel from "~/app/Utils/ModelLoader";
import type RoomNodeBase from "../RoomNodeBase";
import RoomNodeManagerBase from "../RoomNodeManagerBase";
import ProjectorRoomNode from "./ProjectorRoomNode";
import * as THREE from "three";
import { RoomNodeManagerType } from "../RoomNodeRegistry";

export default class ProjectorManager extends RoomNodeManagerBase {
	private m_availableDevices = [] as { deviceName: string }[];

	public override setup(): void {
		this.m_roomNodeMgrType = RoomNodeManagerType.RNM_PROJECTOR;
	}
	public override getNextAvailableDeviceName(): string {

		return "";
	};

	public override createRoomNode(uid?: string, position?: THREE.Vector3, orientation?: THREE.Quaternion, params: any = {}): RoomNodeBase | undefined {

		if (!params.deviceName) {

			params.deviceName = this.getNextAvailableDeviceName();
		}

		const projector = new ProjectorRoomNode(
			this.m_publisher,
			(roomNode: RoomNodeBase) => {
				this.m_roomNodes.push(roomNode);
				this.m_container3D.add(roomNode.getRawObject3D()!);

				this.setMarkerForRoomNode(roomNode);
			},
			uid,
			position,
			orientation,
		);

		projector.fromParams(params);

		return projector;
	}
	public override onRoomNodeChanged(roomNode: RoomNodeBase, onstart: Boolean) {

	}

	public override getTemplate3DObject(): Promise<THREE.Object3D<THREE.Object3DEventMap>> {
		return loadModel("/models/output_unidirectional.glb");
	}

	public override toJson(): any {
		let json = { name: "Projector", roomNodes: [] as any[] };
		json.roomNodes = this.m_roomNodes.map((roomNode: RoomNodeBase) => roomNode.toJson());
	}

	public override fromJson(json: any): void {
		this.m_availableDevices = json.availableDevices;

		json.nodes.forEach((rn: any) => {
			if (this.getRoomNodeByUID(rn.uid)) {
				this.getRoomNodeByUID(rn.uid)!.fromJson(rn, false);
			} else {
				this.createRoomNode(rn.uid, rn.position, rn.orientation, rn.params);
			}
		})
	}
}
