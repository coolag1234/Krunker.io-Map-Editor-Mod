// ==UserScript==
// @name         Krunker.io Map Editor Mod
// @description  Krunker.io Map Editor Mod
// @updateURL    https://github.com/Tehchy/Krunker.io-Map-Editor-Mod/raw/master/userscript.user.js
// @downloadURL  https://github.com/Tehchy/Krunker.io-Map-Editor-Mod/raw/master/userscript.user.js
// @version      1.9
// @author       Tehchy
// @match        https://krunker.io/editor.html
// @require      https://github.com/Tehchy/Krunker.io-Map-Editor-Mod/raw/master/prefabs.js?v=1.9
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// ==/UserScript==

window.stop()
document.innerHTML = ""

class Mod {
    constructor(info) {
        this.info = info
        this.hooks = {
            object: null,
            config: null,
            gui: null,
            three: null
        }
        this.settings = {
            degToRad: false,
            backupMap: false,
            antiAlias: false,
            highPrecision: false,
        }
        this.copy = null
        this.groups = []
        this.rotation = 0
        this.mainMenu = null
        this.prefabMenu = null
        this.gui = null
        this.onLoad()
    }

    objectSelected(group = false) {
        let selected = this.hooks.config.transformControl.object
        return selected ? (group ? (Object.keys(this.groups).includes(selected.uuid) ? selected : false) : selected) : false
    }
    
    jsonInput(fromfile = false) {
        if (fromfile) {
            let file = document.createElement('input')
            file.type = 'file'
            file.id = 'jsonInput'
            
            let self = this
            file.addEventListener('change', function(evt) {
                let files = evt.target.files;
                if (files.length > 1) return alert('Only 1 file please')
                if (files.length < 1) return alert('Please select 1 file')
                let f = files[0]
                let reader = new FileReader();

                reader.onload = (function(theFile) {
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
            //this.hooks.config.addObject(this.hooks.object.defaultFromType("CUBE"))
            //selected = this.objectSelected()
        }
        if (selected) {
            if (!fix) this.hooks.config.removeObject()
            
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
                
                this.hooks.config.addObject(this.hooks.object.deserialize(ob))
            }
            this.rotation = 0
            this.prefabMenu.__controllers[2].setValue(this.rotation)
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
    
    rotateObjectsOld(ob, rotation = 90) {
        switch (rotation) {
            case 90: return this.changeAngle(ob)
            case 180: return this.reflectAngle(ob)
            case 270: return this.reflectAngle(this.changeAngle(ob))
            default: return ob
        }
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
        //Credit JustProb
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
        for (let ob of this.hooks.config.objInstances) {
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
                    this.hooks.config.removeObject(obbys[i])
                }
            }
            
            if (ret) {
                return intersect
            } else {
                this.copy = JSON.stringify(intersect)
            }
        } else {
            this.groups[selected.uuid] = {owner: selected, pos: {x: selected.position.x, y: selected.position.y, z: selected.position.z}, objects: intersect}
        }
    }
    
    exportObjects(full = false) {
        let obs = this.copyObjects(false, false, true)
        if (obs.length == 0) return alert('There was nothing to save')
        let nme = prompt("Name your prefab", "");
        if (nme == null || nme == "") return alert('Please name your prefab')
        if (full) 
            obs = {
                "name": "prefab_" + nme.replace(/ /g,"_"),
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
        this.download(JSON.stringify(obs), 'prefab_' + nme.replace(/ /g,"_") + '.txt', 'text/plain');
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
        let obs = this.hooks.config.objInstances.filter(ob => this.groups[selected.uuid].objects.includes(ob.boundingMesh.uuid))
       /* for (var i = 0; i < this.hooks.config.objInstances.length; i++) {
            if (!this.groups[selected.uuid].objects.includes(this.hooks.config.objInstances[i].boundingMesh.uuid)) continue
            
                remOb.push(this.hooks.config.objInstances[i])
        }*/
            
        for (var i = 0; i < obs.length; i++)
            this.hooks.config.removeObject(obs[i])
        
        delete this.groups[selected.uuid]
    }
    
    duplicateGroup() {
        if (Object.keys(this.groups).length == 0) return
        return //later
    }
    
    checkGroup() {
        if (Object.keys(this.groups).length == 0) return
        
        for (var uuid in this.groups) {
            let group = this.groups[uuid],
                currPos = group.owner.position,
                oldPos = group.pos,
                diffPos = [currPos.x - oldPos.x, currPos.y - oldPos.y, currPos.z - oldPos.z]
                
            if (diffPos[0] === 0 && diffPos[1] === 0 && diffPos[2] === 0) continue // no changes
            
            let obs = this.hooks.config.objInstances.filter(ob => group.objects.includes(ob.boundingMesh.uuid))

            for (let ob of obs) {
                ob.boundingMesh.position.x += diffPos[0]
                ob.boundingMesh.position.y += diffPos[1]
                ob.boundingMesh.position.z += diffPos[2]
            }
            this.groups[group.owner.uuid].pos = {x: currPos.x, y: currPos.y, z: currPos.z}
        }
    }
    
    stopGrouping() {
        if (Object.keys(this.groups).length == 0) return alert('You cant stop a group that doesnt exist')
            
        let selected = this.objectSelected(true)
        if (!selected) return alert('You cant stop a group that doesnt exist')
        
        delete this.groups[selected.uuid]
        return this.hooks.config.removeObject(selected.userData.owner)
    }
    
    fixVehicle() {
        this.replaceObject('[{"p":[0,0,0],"s":[47,9,17],"v":1},{"p":[5,9,0],"s":[26,6,17],"v":1}]', true)
    }
    
    spawnPlaceholder() {
        let pos = this.hooks.config.camera.getWorldPosition()
        let obph = {p: [], s: [10, 10, 10], e: 16777215, o: 0.3, c: 0}
        obph.p[0] = pos.x
        obph.p[1] = pos.y - 10
        obph.p[2] = pos.z
        this.hooks.config.addObject(this.hooks.object.deserialize(obph))
    }
    
    colorizeMap(input = false, gold = false, rand = false) {
        if (this.settings.backupMap) this.backupMap()
        
        if (input != false && (input == null || input == "")) return alert("Please input colors (ex: #000000,#ffffff)")
            
        if (input) input = input.trim().split(',')

        for (let ob of this.hooks.config.objInstances) {
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
            
        for (let ob of this.hooks.config.objInstances) {
            ob.pos[0] *= sX,
            ob.pos[1] *= sY,
            ob.pos[2] *= sZ

            ob.size[0] *= sX,
            ob.size[1] *= sY,
            ob.size[2] *= sZ
        }
    }
    
    transformMap() {
        return alert('This will be functional in a later update')
    }
    
    backupMap() {
        return this.hooks.config.exportMap()
    }
        
    intersect(a, b) {
        return (a.minX <= b.maxX && a.maxX >= b.minX) &&
            (a.minY <= b.maxY && a.maxY >= b.minY) &&
            (a.minZ <= b.maxZ && a.maxZ >= b.minZ);
    }

    addControls() {
        document.getElementById("bottomBar").insertAdjacentHTML('beforeend', '<div class="bottomPanel"><div id="spawnPlaceholder" class="bottomButton">Spawn Placeholder</div></div>');

        document.getElementById("spawnPlaceholder").addEventListener("click", t => {  
            this.spawnPlaceholder()
        })
        
        window.addEventListener("keydown", t => {
            if (!this.hooks.config.isTyping(t))
                switch (t.keyCode) {
                    case 67: //ctrl c
                        return t.ctrlKey ? this.copyObjects() : false
                    case 86:
                        return t.ctrlKey ? this.pasteObjects() : false
                    case 70:
                        return t.shiftKey ? this.fixVehicle() : false
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
            this.hooks.three.Math.degToRad(r[0]),
            this.hooks.three.Math.degToRad(r[1]),
            this.hooks.three.Math.degToRad(r[2]),
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
        options.exportObj = (() => this.exportObjects())
        options.exportFull = (() => this.exportObjects(true))
        options.copy = (() => this.copyObjects())
        options.cut = (() => this.copyObjects(true))
        options.paste = (() => this.pasteObjects())
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
        
        this.mainMenu = this.gui.addFolder("Map Editor Mod v" + this.info.script.version)
        this.mainMenu.open()
        
        this.prefabMenu = this.mainMenu.addFolder("Prefabs")
        let prefabs = localStorage.getItem('krunk_prefabs') ? JSON.parse(localStorage.getItem('krunk_prefabs')) : {}
        
        options.json = (() => this.jsonInput())
        options.file = (() => this.jsonInput(true))
        this.prefabMenu.add(options, "json").name("Json Import")
        this.prefabMenu.add(options, "file").name("File Import")
        this.prefabMenu.add(options, "rotation", 0, 359, 1).name("Rotation").onChange(t => {this.rotation = t})  
        this.prefabFolder(prefabs, this.prefabMenu)
        
        let groupingMenu = this.mainMenu.addFolder("MultiObject")
        groupingMenu.open()
        groupingMenu.add(options, "create").name("Create Group") 
        groupingMenu.add(options, "stop").name("Stop Group") 
        groupingMenu.add(options, "copy").name("Copy")
        groupingMenu.add(options, "cut").name("Cut")
        groupingMenu.add(options, "paste").name("Paste")
        
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
    }
    
    prefabFolder(prefabs, menu) {
        let options = {}
        for (let ob in prefabs) {
            if (!Array.isArray(prefabs[ob])) {
                let folder = menu.addFolder(ob)
                this.prefabFolder(prefabs[ob], folder)
            } else {
                options[ob] = (() => this.replaceObject(JSON.stringify(prefabs[ob])))
                menu.add(options, ob).name(ob + " [" + prefabs[ob].length + "]")
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
            .replace(/(\w+).boundingNoncollidableBoxMaterial=new (.*)}\);const/, '$1.boundingNoncollidableBoxMaterial = new $2 });window.mod.hooks.object = $1;const')
            //.replace(/(\w+).init\(document.getElementById\("container"\)\)/, '$1.init(document.getElementById("container")), window.mod.hooks.config = $1')
            .replace(/this\.transformControl\.update\(\)/, 'this.transformControl.update(),window.mod.hooks.config = this,window.mod.loop()')
            .replace(/\[\],(\w+).open\(\),/, '[],$1.open(),window.mod.hooks.gui=$1,')
            .replace(/initScene\(\){this\.scene=new (\w+).Scene,/, 'initScene(){this.scene=new $1.Scene,window.mod.hooks.three = $1,')
            .replace(/{(\w+)\[(\w+)\]\=(\w+)}\);this\.objConfigOptions/, '{$1[$2]=$2 == "rot" ? window.mod.degToRad($3) : $3});this.objConfigOptions')
            .replace('{this.removeObject()}', '{window.mod.objectSelected(true) ? window.mod.removeGroup() : this.removeObject()}')
            .replace('{this.duplicateObject()}', '{window.mod.objectSelected(true) ? window.mod.duplicateGroup() : this.duplicateObject()}')
            .replace(/antialias:!1/g, 'antialias:window.mod.settings.antiAlias ? 1 : !1')
            .replace(/precision:"mediump"/g, 'precision:window.mod.settings.highPrecision ? "highp": "mediump"')
            
        GM_xmlhttpRequest({
            method: "GET",
            url: "https://krunker.io/editor.html",
            onload: res => {
                let html = res.responseText
                html = html.replace(' src="js/editor.js">', `>${Mod.toString()}\nwindow.mod = new Mod(${JSON.stringify(GM.info)});\n${code.toString()}`)
                document.open()
                document.write(html)
                document.close()
            }
        })
    }
})
