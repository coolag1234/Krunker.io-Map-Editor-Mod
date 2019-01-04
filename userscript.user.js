// ==UserScript==
// @name         Krunker.io Map Editor Mod
// @description  Krunker.io Map Editor Mod
// @updateURL    https://github.com/Tehchy/Krunker.io-Map-Editor-Mod/raw/master/userscript.user.js
// @downloadURL  https://github.com/Tehchy/Krunker.io-Map-Editor-Mod/raw/master/userscript.user.js
// @version      2.2
// @author       Tehchy
// @match        https://krunker.io/editor.html
// @require      https://github.com/Tehchy/Krunker.io-Map-Editor-Mod/raw/master/assets.js?v=2.0_2
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// ==/UserScript==

window.stop()
document.innerHTML = ""

class Mod {
    constructor(v) {
        this.version = v
        this.hooks = {
            objectInstance: null,
            editor: null,
            gui: null,
            three: null
        }
        this.settings = {
            degToRad: false,
            backupMap: false,
            antiAlias: false,
            highPrecision: false,
            gridVisibility: true,
            gridOpacity: .25,
            gridSize: 100,
            gridDivisions: 10,
        }
        this.copy = null
        this.groups = []
        this.rotation = 0
        this.mainMenu = null
        this.assetMenu = null
        this.gui = null
        this.onLoad()
    }

    objectSelected(group = false) {
        let selected = this.hooks.editor.transformControl.object
        return selected ? (group ? (Object.keys(this.groups).includes(selected.uuid) ? selected : false) : selected) : false
    }
    
    jsonInput(fromfile = false) {
        if (fromfile) {
            let file = document.createElement('input')
            file.type = 'file'
            file.id = 'jsonInput'
            
            let self = this
            file.addEventListener('change', ev => {
                let files = ev.target.files;
                if (files.length != 1) return alert('Please select 1 file')
                let f = files[0]
                let reader = new FileReader();

                reader.onload = (theFile => {
                    return e => {
                        self.replaceObject(e.target.result)
                    };
                })(f);

                reader.readAsText(f);
            }, false);
            
            file.type = 'file'
            file.id = 'jsonInput'
            file.click()
            
            return
        }
        let json = prompt("Import Object Json", "");
        if (json != null && json != "" && this.objectSelected()) this.replaceObject(json)
    }

    replaceObject(str, fix = false) {
        let selected = this.objectSelected()
        if (!selected) {
            //this.hooks.editor.addObject(this.hooks.objectInstance.defaultFromType("CUBE"))
            //selected = this.objectSelected()
        }
        if (selected) {
            if (!fix) this.hooks.editor.removeObject()
            
            let jsp = JSON.parse(str);
            jsp = jsp.objects ? jsp.objects : jsp
            
            let rotation = this.rotation;
            if (fix) {
                this.hooks.gui.__folders["Object Config"].__controllers[1].setValue(false)
                rotation = this.toDegree(selected.rotation.y) + 180
            }
             
            if (rotation > 0) {
                jsp = this.rotateObjects(jsp, rotation)
            }
            
            let center = this.findCenter(jsp)
            for (let ob of jsp) {
                ob.p[0] += selected.userData.owner.position.x - center[0]
                ob.p[1] += selected.userData.owner.position.y - (selected.scale.y / 2) - center[1]
                ob.p[2] += selected.userData.owner.position.z - center[2] - (fix ? 0.5 : 0)
                
                this.hooks.editor.addObject(this.hooks.objectInstance.deserialize(ob))
            }
            this.rotation = 0
            this.assetMenu.__controllers[2].setValue(this.rotation)
        } else {
            alert("You must select a object first")
        }
    }
    
    toRadians(angle) {
        return angle * (Math.PI / 180)
    }
    
    toDegree(angle) {
      return angle * (180 / Math.PI)
    }

    rotateObjects(jsp, deg) {
        //Credit JustProb
        switch (deg) {
            case 90: return this.changeAngle(jsp)
            case 180: return this.reflectAngle(jsp)
            case 270: return this.reflectAngle(this.changeAngle(jsp))
            default: return this.rotate3D(jsp, deg)
        }
        return jsp
    }

    rotate3D(jsp, deg) {
        //Credit JustProb
        deg = this.toRadians(deg - 180)

        for (let ob of jsp) {
            if (ob.id == 4) {
                alert('Sorry we cant rotate planes (Ramps)')
                return jsp
            }
            let dist = Math.sqrt(ob.p[0] * ob.p[0] + ob.p[2] * ob.p[2])
            let angle = this.getAngle(ob)
            ob.p[0] = -1 * Math.cos(-angle + deg) * dist
            ob.p[2] = Math.sin(angle - deg) * dist
            if (ob.r == undefined) ob.r = [0,0,0]
            ob.r[1] = this.toRadians(360 - this.toDegree(deg)) + ob.r[1];
        }

        return jsp
    }
    
    getAngle(ob, live = false) {
        //Credit JustProb
        let x = live ? ob.x : ob.p[0],
            z = live ? ob.z : ob.p[2],
            angle =  Math.atan2(-1 * z, x)
        return angle < 0 ? angle + (Math.PI * 2) : angle
    } 
    
    changeAngle(jsp){
        //Credit JustProb
        for (let ob of jsp) {
            let x = ob.s[0],
                y = ob.s[2]
            ob.s[0] = y
            ob.s[2] = x
            let a = ob.p[0],
                b = ob.p[2]
            ob.p[0] = b
            ob.p[2] = a
        }
        
        return jsp
    }

    reflectAngle(jsp){
        //Credit JustProb
        for (let ob of jsp) {
            ob.p[0] = -1 * ob.p[0]
            ob.p[2] = -1 * ob.p[2]
        }
        return jsp
    }
    
    findCenter(jsp) {
        let min = jsp[0].p[1],
        xMin = jsp[0].p[0] - (jsp[0].s[0] /2),
        xMax = jsp[0].p[0] + (jsp[0].s[0] /2),
        yMin = jsp[0].p[2] - (jsp[0].s[2] /2),
        yMax = jsp[0].p[2] + (jsp[0].s[2] /2)


        for (let ob of jsp) {
            if (ob.p[1]  < min) min = ob.p[1]
            if (ob.p[0] - (ob.s[0] /2) < xMin) xMin = ob.p[0] - (ob.s[0] /2)
            if (ob.p[0] + (ob.s[0] /2) > xMax) xMax = ob.p[0] + (ob.s[0] /2)
            if (ob.p[2] - (ob.s[2] /2) < yMin) yMin = ob.p[2] - (ob.s[2] /2)
            if (ob.p[2] + (ob.s[2] /2) > yMax) yMax = ob.p[2] + (ob.s[2] /2)
        }

        return [Math.round((xMin + xMax)/2), min, Math.round((yMin + yMax)/2)]
    }
    
    copyObjects(cut = false, group = false, ret = false) {
        let selected = this.objectSelected()
        if (!selected) return alert('Stretch a cube over your objects then try again')
        if (group && this.groups && Object.keys(this.groups).includes(selected.uuid)) return alert('You cant combine groups')
        
        let pos = {
            minX: selected.position.x - (selected.scale.x / 2), 
            minY: selected.position.y, 
            minZ: selected.position.z - (selected.scale.z / 2),  
            maxX: selected.position.x + (selected.scale.x / 2), 
            maxY: selected.position.y + selected.scale.y, 
            maxZ: selected.position.z + (selected.scale.z / 2), 
        }
        let intersect = []
        let obbys = []
        for (let ob of this.hooks.editor.objInstances) {
            if (ob.boundingMesh.uuid == selected.uuid) continue
            if (this.intersect({
                    minX: ob.boundingMesh.position.x - (ob.boundingMesh.scale.x / 2), 
                    minY: ob.boundingMesh.position.y, 
                    minZ: ob.boundingMesh.position.z - (ob.boundingMesh.scale.z / 2), 
                    maxX: ob.boundingMesh.position.x + (ob.boundingMesh.scale.x / 2), 
                    maxY: ob.boundingMesh.position.y + ob.boundingMesh.scale.y, 
                    maxZ: ob.boundingMesh.position.z + (ob.boundingMesh.scale.z / 2)
                }, pos)) {
                if (!group) obbys.push(ob)
                intersect.push(group ? ob.boundingMesh.uuid : ob.serialize())
            }
        }
        
        if (!group) {
            if (cut && obbys.length && !group) {
                for (var i = 0; i < obbys.length; i++) {
                    this.hooks.editor.removeObject(obbys[i])
                }
            }
            
            if (ret) {
                return intersect
            } else {
                this.copy = JSON.stringify(intersect)
            }
        } else {
            selected.userData.owner.emissive = 16777215
            selected.userData.owner.opacity = 0.5
            selected.userData.owner.color = 0
            this.groups[selected.uuid] = {
                owner: selected, 
                pos: {x: selected.position.x, y: selected.position.y, z: selected.position.z}, 
                scale: {x: selected.scale.x, y: selected.scale.y, z: selected.scale.z},
                objects: intersect
            }
        }
    }
    
    exportObjects(full = false) {
        let obs = this.copyObjects(false, false, true)
        if (obs.length == 0) return alert('There was nothing to save')
        let nme = prompt("Name your asset", "");
        if (nme == null || nme == "") return alert('Please name your asset')
            
        let center = this.findCenter(obs)
        for (let ob of obs) {
            ob.p[0] -= center[0]
            ob.p[1] -= center[1]
            ob.p[2] -= center[2]
        }
    
        if (full) 
            obs = {
                "name": "asset_" + nme.replace(/ /g,"_"),
                "modURL":"https://www.dropbox.com/s/4j76kiqemdo6d9a/MMOKBill.zip?dl=0",
                "ambient":9937064,
                "light":15923452,
                "sky":14477549,
                "fog":9280160,
                "fogD":900,
                "camPos":[0,0,0],
                "spawns":[], 
                "objects": obs
            }
        this.download(JSON.stringify(obs), 'asset_' + nme.replace(/ /g,"_") + '.txt', 'text/plain');
    }
    
    pasteObjects() {
        if (!this.copy) return alert('Please copy objects first')
        if (!this.objectSelected()) return alert('Select a object you would like to replace with your copied objects')
        this.replaceObject(this.copy)
    }
    
    removeGroup() {
        if (Object.keys(this.groups).length == 0) return
        
        let selected = this.objectSelected(true)
        if (!selected) return 
        
        let remOb = []
        
        this.groups[selected.uuid].objects.push(selected.uuid)
        let obs = this.hooks.editor.objInstances.filter(ob => this.groups[selected.uuid].objects.includes(ob.boundingMesh.uuid))
       /* for (var i = 0; i < this.hooks.editor.objInstances.length; i++) {
            if (!this.groups[selected.uuid].objects.includes(this.hooks.editor.objInstances[i].boundingMesh.uuid)) continue
            
                remOb.push(this.hooks.editor.objInstances[i])
        }*/
            
        for (var i = 0; i < obs.length; i++)
            this.hooks.editor.removeObject(obs[i])
        
        delete this.groups[selected.uuid]
    }
    
    duplicateGroup() {
        if (Object.keys(this.groups).length == 0) return

        let selected = this.objectSelected(true)
        if (!selected) return alert('You cant duplicate a group that doesnt exist')
            
        let group = this.groups[selected.uuid]
        let obs = this.hooks.editor.objInstances.filter(ob => group.objects.includes(ob.boundingMesh.uuid))
        let newObs = [];
        
        for (let ob of obs) {
            let newOb = this.hooks.objectInstance.deserialize(ob.serialize())
            newObs.push(newOb.boundingMesh.uuid)
            this.hooks.editor.addObject(newOb)
        }
        
        let groupBox = this.hooks.objectInstance.deserialize(selected.userData.owner.serialize())
        this.hooks.editor.addObject(groupBox)
        
        selected = this.objectSelected()
        this.groups[selected.uuid] = {
            owner: selected, 
            pos: {x: selected.position.x, y: selected.position.y, z: selected.position.z},
            scale: {x: selected.scale.x, y: selected.scale.y, z: selected.scale.z},
            objects: newObs
        }
    }
    
    checkGroup() {
        if (Object.keys(this.groups).length == 0) return
        
        for (var uuid in this.groups) {
            let group = this.groups[uuid]
            
            //Position Change Check
            let currPos = group.owner.position,
                oldPos = group.pos,
                diffPos = [currPos.x - oldPos.x, currPos.y - oldPos.y, currPos.z - oldPos.z],
                changedPos = !(diffPos[0] === 0 && diffPos[1] === 0 && diffPos[2] === 0)
            
            //Scale Change Check
            let currScale = group.owner.scale,
                oldScale = group.scale,
                diffScale = [(currScale.x / oldScale.x) , (currScale.y  / oldScale.y), (currScale.z / oldScale.z)],
                changedScale = !(diffScale[0] === 1 && diffScale[1] === 1 && diffScale[2] === 1)
                
            if (!changedPos && !changedScale) continue // no changes
            
            let obs = this.hooks.editor.objInstances.filter(ob => group.objects.includes(ob.boundingMesh.uuid))

            for (let ob of obs) {
                if (changedScale) {
                    ob.boundingMesh.position.x *= diffScale[0]
                    ob.boundingMesh.position.y *= diffScale[1]
                    ob.boundingMesh.position.z *= diffScale[2]
                    
                    ob.boundingMesh.scale.x *= diffScale[0]
                    ob.boundingMesh.scale.y *= diffScale[1]
                    ob.boundingMesh.scale.z *= diffScale[2]
                } else {
                    ob.boundingMesh.position.x += diffPos[0]
                    ob.boundingMesh.position.y += diffPos[1]
                    ob.boundingMesh.position.z += diffPos[2]
                }
            }
            
            this.groups[group.owner.uuid].pos = {x: currPos.x, y: currPos.y, z: currPos.z}
            this.groups[group.owner.uuid].scale = {x: currScale.x, y: currScale.y, z: currScale.z}
        }
    }
    
    stopGrouping(all = false) {
        if (Object.keys(this.groups).length == 0) return alert('You cant stop a group that doesnt exist')
            
        if (all) {
            let obs = this.hooks.editor.objInstances.filter(ob => Object.keys(this.groups).includes(ob.boundingMesh.uuid))
            for (let ob of obs) {
                this.hooks.editor.removeObject(ob)
            }
            this.groups = []
        } else {
            let selected = this.objectSelected(true)
            if (!selected) return alert('You cant stop a group that doesnt exist')
            
            delete this.groups[selected.uuid]
            return this.hooks.editor.removeObject(selected.userData.owner)
        }
    }
    
    editGroup(change = 'texture', val = null) {
        if (Object.keys(this.groups).length == 0) return alert('You cant edit a group that doesnt exist')
        let selected = this.objectSelected(true)
        if (!selected) return alert('You cant edit a group that doesnt exist')
        let group = this.groups[selected.uuid]
        let obs = this.hooks.editor.objInstances.filter(ob => group.objects.includes(ob.boundingMesh.uuid))
        switch (change) {
            case 'texture': for (let ob of obs) ob.texture = val; break;
        }
    }
    
    fixVehicle() {
        this.replaceObject('[{"p":[0,0,0],"s":[47,9,17],"v":1},{"p":[5,9,0],"s":[26,6,17],"v":1}]', true)
    }
    
    spawnPlaceholder() {
        let pos = this.hooks.editor.camera.getWorldPosition()
        let obph = {p: [], s: [10, 10, 10], e: 16777215, o: 0.3, c: 0}
        obph.p[0] = pos.x
        obph.p[1] = pos.y - 10
        obph.p[2] = pos.z
        this.hooks.editor.addObject(this.hooks.objectInstance.deserialize(obph))
    }
    
    colorizeMap(input = false, gold = false, rand = false) {
        if (this.settings.backupMap) this.backupMap()
        
        if (input != false && (input == null || input == "")) return alert("Please input colors (ex: #000000,#ffffff)")
            
        if (input) input = input.trim().split(',')

        for (let ob of this.hooks.editor.objInstances) {
            if (input) ob.color = input.length > 1 ? input[Math.floor(Math.random() * input.length)] : input[0]
            if (gold) ob.color = "#FFDF00", ob.emissive = "#D4AF37"
            if (rand) ob.color = this.getRandomColor()
        }
    }
        
    getRandomColor() {
        let length = 6,
            chars = '0123456789ABCDEF',
            hex = '#';
        while (length--) hex += chars[(Math.random() * 16) | 0]
        return hex
    }
    
    scaleMap() {
        if (this.settings.backupMap) this.backupMap()
            
        let sX = this.mainMenu.__folders["Other Features"].__folders["Scale Map"].__controllers[0].getValue(),
            sY = this.mainMenu.__folders["Other Features"].__folders["Scale Map"].__controllers[1].getValue(),
            sZ = this.mainMenu.__folders["Other Features"].__folders["Scale Map"].__controllers[2].getValue()
            
        for (let ob of this.hooks.editor.objInstances) {
            let pos = ob.pos, size = ob.size
            
            pos[0] *= sX
            pos[1] *= sY
            pos[2] *= sZ

            size[0] *= sX
            size[1] *= sY
            size[2] *= sZ
            
            ob.size = size
            ob.pos = pos
        }
    }
    
    transformMap() {
        return alert('This will be functional in a later update')
    }
    
    backupMap() {
        return this.hooks.editor.exportMap()
    }
        
    intersect(a, b) {
        return (a.minX <= b.maxX && a.maxX >= b.minX) &&
            (a.minY <= b.maxY && a.maxY >= b.minY) &&
            (a.minZ <= b.maxZ && a.maxZ >= b.minZ);
    }

    addControls() {
        document.getElementById("exportMap").insertAdjacentHTML('afterend', '<div id="newMap" class="bottomButton">New Map</div>');
        document.getElementById("bottomBar").insertAdjacentHTML('beforeend', '<div class="bottomPanel"><div id="spawnPlaceholder" class="bottomButton">Spawn Placeholder</div></div>');

        document.getElementById("newMap").addEventListener("click", t => {  
            confirm("Are you sure you want to reset the map?") && this.hooks.editor.clearMap()
        })
        document.getElementById("spawnPlaceholder").addEventListener("click", t => {  
            this.spawnPlaceholder()
        })
        
        window.addEventListener("keydown", t => {
            if (!this.hooks.editor.isTyping(t))
                switch (t.keyCode) {
                    case 67: //ctrl c
                        return t.ctrlKey ? this.copyObjects() : false
                    case 86:
                        return t.ctrlKey ? this.pasteObjects() : false
                    case 70:
                        return t.shiftKey ? this.fixVehicle() : false
                    case 82:
                        return t.shiftKey ? this.hooks.editor.duplicateObject() : false
                    case 80: 
                        return this.spawnPlaceholder()
                }
        })
    }
    
    download(content, fileName, contentType) {
        //Credit to - https://stackoverflow.com/a/34156339
        let a = document.createElement("a");
        let file = new Blob([content], {type: contentType});
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
    }
    
    degToRad(r) {
        if (!this.settings.degToRad) return r
        return [
            r[0] * (Math.PI / 180),
            r[1] * (Math.PI / 180),
            r[2] * (Math.PI / 180),
        ]
    }
    
	addStyle(css) {
		let head = document.head || document.getElementsByTagName('head')[0]
		if (head) {
			let style = document.createElement("style")
			style.type = "text/css"
			style.appendChild(document.createTextNode(css))
			head.appendChild(style)
		}
	}
    
    loop() {
        this.checkGroup()
        
        this.hooks.editor.gridHelper.visible = this.settings.gridVisibility;
        this.hooks.editor.gridHelper.material.opacity = this.settings.gridOpacity;
    }

    removeAd() {//Sorry Sidney it blocks my second GUI
        document.body.removeChild(document.body.children[0])
    }
    
    setupSettings() {
        let ls = this.getSavedVal('krunker_editor_mod')
        if (ls == null) return
        try {
            JSON.parse(ls);
        } catch (e) {
            return
        }
        let jsp = JSON.parse(ls)
        for (let set in jsp) {
            this.settings[set] = jsp[set]
        }
    }
    
    setSettings(k, v) {
        this.settings[k] = v
        this.saveVal('krunker_editor_mod', JSON.stringify(this.settings))
    }
    
    getSavedVal(t) {
        const r = "undefined" != typeof Storage;
        return r ? localStorage.getItem(t) : null
    }
    
    saveVal(t, e) {
        const r = "undefined" != typeof Storage;
        r && localStorage.setItem(t, e)
    }

    addGui() {
        this.addStyle(`#gui { position: absolute; top: 2px; left: 2px }`)
        
        this.gui = new dat.GUI
        this.gui.domElement.id = 'gui'
        
        let options = {rotation: 0}
        options.create = (() => this.copyObjects(false, true))
        options.stop = (() => this.stopGrouping())
        options.stopAll = (() => this.stopGrouping(true))
        options.exportObj = (() => this.exportObjects())
        options.exportFull = (() => this.exportObjects(true))
        options.copy = (() => this.copyObjects())
        options.cut = (() => this.copyObjects(true))
        options.paste = (() => this.pasteObjects())
        options.texture = "DEFAULT"
        options.degToRad = this.settings.degToRad
        options.backupMap = this.settings.backupMap
        options.antiAlias = this.settings.antiAlias
        options.highPrecision = this.settings.highPrecision
        options.scaleMapX = 0
        options.scaleMapY = 0
        options.scaleMapZ = 0      
        options.scaleMap = (() => this.scaleMap())    
        options.transformMap = (() => this.transformMap())
        options.colorizeR = (() => this.colorizeMap(false, false, true))
        options.colorizeG = (() => this.colorizeMap(false, true))
        options.colorizeI = (() => this.colorizeMap(prompt("Input colors. (Seperate using a comma)", "")))
        options.gridVisibility = this.settings.gridVisibility
        options.gridOpacity = this.settings.gridOpacity
        options.gridDivisions = this.settings.gridDivisions
        options.gridSize = this.settings.gridSize
        
        this.mainMenu = this.gui.addFolder("Map Editor Mod v" + this.version)
        this.mainMenu.open()
        
        this.assetMenu = this.mainMenu.addFolder("Assets")
        let assets = localStorage.getItem('krunk_assets') ? JSON.parse(localStorage.getItem('krunk_assets')) : {}
        
        options.json = (() => this.jsonInput())
        options.file = (() => this.jsonInput(true))
        this.assetMenu.add(options, "json").name("Json Import")
        this.assetMenu.add(options, "file").name("File Import")
        this.assetMenu.add(options, "rotation", 0, 359, 1).name("Rotation").onChange(t => {this.rotation = t})  
        this.assetFolder(assets, this.assetMenu)
        
        let groupingMenu = this.mainMenu.addFolder("MultiObject")
        groupingMenu.open()
        groupingMenu.add(options, "create").name("Create Group") 
        groupingMenu.add(options, "stop").name("Stop Group") 
        groupingMenu.add(options, "stopAll").name("Stop All Groups") 
        groupingMenu.add(options, "copy").name("Copy")
        groupingMenu.add(options, "cut").name("Cut")
        groupingMenu.add(options, "paste").name("Paste")
        
        let editMenu = groupingMenu.addFolder("Edit")
        let textures = {
            Default: "DEFAULT",
            Wall: "WALL",
            Dirt: "DIRT",
            Floor: "FLOOR",
            Grid: "GRID",
            Grey: "GREY",
            Roof: "ROOF",
            Flag: "FLAG",
        };
        editMenu.add(options, "texture").options(textures).name("Texture").listen().onChange(t => {
            this.editGroup('texture', t);
        })
        
        let exportMenu = groupingMenu.addFolder("Export")
        
        exportMenu.add(options, "exportObj").name("Objects") 
        exportMenu.add(options, "exportFull").name("Full")         
        
        let otherMenu = this.mainMenu.addFolder("Other Features")
        
        let colorizeMenu = otherMenu.addFolder("Colorize")
        colorizeMenu.add(options, "colorizeR").name("Random") 
        colorizeMenu.add(options, "colorizeG").name("Gold") 
        colorizeMenu.add(options, "colorizeI").name("Input") 
        
        let scaleMapMenu = otherMenu.addFolder("Scale Map")
        scaleMapMenu.add(options, "scaleMapX").name("X") 
        scaleMapMenu.add(options, "scaleMapY").name("Y") 
        scaleMapMenu.add(options, "scaleMapZ").name("Z") 
        scaleMapMenu.add(options, "scaleMap").name("Scale")
        
        /*
        let transformMenu = otherMenu.addFolder("Transform Map")
        transformMenu.add(options, "transformMap").name("Transform")
        */
        
        let settingsMenu = this.mainMenu.addFolder('Settings')
        settingsMenu.add(options, "degToRad").name("Anti Radians").onChange(t => {this.setSettings('degToRad', t)})      
        settingsMenu.add(options, "backupMap").name("Auto Backup").onChange(t => {this.setSettings('backupMap', t)})
        settingsMenu.add(options, "antiAlias").name("Anti-aliasing").onChange(t => {this.setSettings('antiAlias', t), alert("This change will occur after you refresh")})      
        settingsMenu.add(options, "highPrecision").name("High Precision").onChange(t => {this.setSettings('highPrecision', t), alert("This change will occur after you refresh")}) 

        let gridMenu = settingsMenu.addFolder('Grid')
        gridMenu.add(options, "gridVisibility").name("Visible").onChange(t => {this.setSettings('gridVisibility', t)})      
        gridMenu.add(options, "gridOpacity", 0.05, 1, 0.05).name("Opacity").onChange(t => {this.setSettings('gridOpacity', t)})
        gridMenu.add(options, "gridSize", 100, 1000, 50).name("Size").onChange(t => {this.setSettings('gridSize', t)})      
        gridMenu.add(options, "gridDivisions").name("Divisions").onChange(t => {this.setSettings('gridDivisions', t)}) 
    }
    
    assetFolder(assets, menu) {
        let options = {}
        for (let ob in assets) {
            if (!Array.isArray(assets[ob])) {
                let folder = menu.addFolder(ob)
                this.assetFolder(assets[ob], folder)
            } else {
                options[ob] = (() => this.replaceObject(JSON.stringify(assets[ob])))
                menu.add(options, ob).name(ob + " [" + assets[ob].length + "]")
            }
        }
    }
    
    onLoad() {
        this.setupSettings()
        this.removeAd()
        this.addGui()
        this.addControls()
        window.onbeforeunload = function() {return true}
    }
}

GM_xmlhttpRequest({
    method: "GET",
    url: "https://krunker.io/js/editor.js",
    onload: res => {
        let code = res.responseText
        code = code.replace(/String\.prototype\.escape=function\(\){(.*)\)},(Number\.)/, "$2")
            .replace('("Sky Color").listen().onChange', '("Sky Color").onChange')
            .replace('("Ambient Light").listen().onChange', '("Ambient Color").onChange')
            .replace('("Light Color").listen().onChange', '("Light Color").onChange')
            .replace('("Fog Color").listen().onChange', '("Fog Color").onChange')
            .replace(/(\w+).boundingNoncollidableBoxMaterial=new (.*)}\);const/, '$1.boundingNoncollidableBoxMaterial = new $2 });window.mod.hooks.objectInstance = $1;const')
            //.replace(/(\w+).init\(document.getElementById\("container"\)\)/, '$1.init(document.getElementById("container")), window.mod.hooks.editor = $1')
            .replace(/this\.transformControl\.update\(\)/, 'this.transformControl.update(),window.mod.hooks.editor = this,window.mod.loop()')
            .replace(/\[\],(\w+).open\(\),/, '[],$1.open(),window.mod.hooks.gui=$1,')
            .replace(/initScene\(\){this\.scene=new (\w+).Scene,/, 'initScene(){this.scene=new $1.Scene,window.mod.hooks.three = $1,')
            .replace(/{(\w+)\[(\w+)\]\=(\w+)}\);this\.objConfigOptions/, '{$1[$2]=$2 == "rot" ? window.mod.degToRad($3) : $3});this.objConfigOptions')
            .replace('{this.removeObject()}', '{window.mod.objectSelected(true) ? window.mod.removeGroup() : this.removeObject()}')
            .replace('{this.duplicateObject()}', '{window.mod.objectSelected(true) ? window.mod.duplicateGroup() : this.duplicateObject()}')
            .replace(/antialias:!1/g, 'antialias:window.mod.settings.antiAlias ? 1 : !1')
            .replace(/precision:"mediump"/g, 'precision:window.mod.settings.highPrecision ? "highp": "mediump"')
            .replace(/GridHelper\(100,10\)/, 'GridHelper(window.mod.settings.gridSize, window.mod.settings.gridDivisions)')
            
        GM_xmlhttpRequest({
            method: "GET",
            url: "https://krunker.io/editor.html",
            onload: res => {
                let html = res.responseText
                html = html.replace(' src="js/editor.js">', `>${Mod.toString()}\nwindow.mod = new Mod(${JSON.stringify(GM.info.script.version)});\n${code.toString()}`)
                document.open()
                document.write(html)
                document.close()
            }
        })
    }
})
