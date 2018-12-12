// ==UserScript==
// @name         Krunker.io Map Editor Mod
// @description  Krunker.io Map Editor Mod
// @updateURL    https://github.com/Tehchy/Krunker.io-Map-Editor-Mod/raw/master/userscript.user.js
// @downloadURL  https://github.com/Tehchy/Krunker.io-Map-Editor-Mod/raw/master/userscript.user.js
// @version      1.4
// @author       Tehchy
// @match        https://krunker.io/editor.html
// @require      https://github.com/Tehchy/Krunker.io-Map-Editor-Mod/raw/master/prefabs.js?v=1.3
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// ==/UserScript==

window.stop()
document.innerHTML = ""

class Mod {
    constructor() {
        this.hooks = {
            object: null,
            config: null,
            gui: null,
            three: null
        }
        this.settings = {
            degToRad: false
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
                rotation = selected.rotation.y * 180 / Math.PI
                rotation = rotation == 90 ? 270 : (rotation == 270 ? 90 : rotation)
            }
             
            if (rotation > 0) {
                jsp = this.rotateObjects(jsp, rotation)
            }
            
            let center = this.findCenter(jsp)
            for (let ob of jsp) {
                ob.p[0] += selected.userData.owner.position.x - center[0]
                ob.p[1] += selected.userData.owner.position.y - (selected.scale.y / 2) - center[1]
                ob.p[2] += selected.userData.owner.position.z - center[2]
                
                this.hooks.config.addObject(this.hooks.object.deserialize(ob))
            }
            this.rotation = 0
            this.prefabMenu.__controllers[2].setValue(this.rotation)
        } else {
            alert("You must select a object first")
        }
    }
    
    rotateObjects(ob, rotation = 90) {
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
    
    findCenter(item) {
        //Credit JustProb
        let min = item[0].p[1],
        xMin = item[0].p[0] - (item[0].s[0] /2),
        xMax = item[0].p[0] + (item[0].s[0] /2),
        yMin = item[0].p[2] - (item[0].s[2] /2),
        yMax = item[0].p[2] + (item[0].s[2] /2)


        for (var index in item) {
            let object = item[index]
            if (object.p[1]  < min) min = object.p[1]
            if (object.p[0] - (object.s[0] /2) < xMin) xMin = object.p[0] - (object.s[0] /2)
            if (object.p[0] + (object.s[0] /2) > xMax) xMax = object.p[0] + (object.s[0] /2)
            if (object.p[2] - (object.s[2] /2) < yMin) yMin = object.p[2] - (object.s[2] /2)
            if (object.p[2] + (object.s[2] /2) > yMax) yMax = object.p[2] + (object.s[2] /2)
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
        for (var i = 0; i < this.hooks.config.objInstances.length; i++) {
            if (this.hooks.config.objInstances[i].boundingMesh.uuid == selected.uuid) continue
            let ob = this.hooks.config.objInstances[i].boundingMesh
            if (this.intersect({
                    minX: ob.position.x - (ob.scale.x / 2), 
                    minY: ob.position.y, 
                    minZ: ob.position.z - (ob.scale.z / 2), 
                    maxX: ob.position.x + (ob.scale.x / 2), 
                    maxY: ob.position.y + ob.scale.y, 
                    maxZ: ob.position.z + (ob.scale.z / 2)
                }, pos)) {
                if (!group) obbys.push(this.hooks.config.objInstances[i])
                intersect.push(group ? this.hooks.config.objInstances[i].boundingMesh.uuid : this.hooks.config.objInstances[i].serialize())
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
                diff = [currPos.x - oldPos.x, currPos.y - oldPos.y, currPos.z - oldPos.z]
            
            if (diff[0] === 0 && diff[1] === 0 && diff[2] === 0) continue // no changes
            
            let obs = this.hooks.config.objInstances.filter(ob => group.objects.includes(ob.boundingMesh.uuid))
            for (var i = 0; i < obs.length; i++) {
                obs[i].boundingMesh.position.x += diff[0]
                obs[i].boundingMesh.position.y += diff[1]
                obs[i].boundingMesh.position.z += diff[2]   
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
        this.replaceObject('[{"p":[-11,2,-1],"s":[47,9,17],"v":1},{"p":[-6,11,-1],"s":[26,6,17],"v":1}]', true)
    }
    
    spawnPlaceholder() {
        let pos = this.hooks.config.camera.getWorldPosition()
        let obph = {p: [], s: [10, 10, 10], e: 16777215, o: 0.3, c: 0}
        obph.p[0] = pos.x
        obph.p[1] = pos.y - 10
        obph.p[2] = pos.z
        this.hooks.config.addObject(this.hooks.object.deserialize(obph))
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
        this.settings = JSON.parse(ls);
    }
    
    setSettings(k, v) {
        console.log(this.settings)
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
        
        this.mainMenu = this.gui.addFolder("Map Editor Mod")
        this.mainMenu.open()
        
        this.prefabMenu = this.mainMenu.addFolder("Prefabs")
        let prefabs = localStorage.getItem('krunk_prefabs') ? JSON.parse(localStorage.getItem('krunk_prefabs')) : {}
        
        options.json = (() => this.jsonInput())
        options.file = (() => this.jsonInput(true))
        this.prefabMenu.add(options, "json").name("Json Import")
        this.prefabMenu.add(options, "file").name("File Import")
        this.prefabMenu.add(options, "rotation", 0, 270, 90).name("Rotation").onChange(t => {this.rotation = t})          
        for (let cat in prefabs) {
            let category = this.prefabMenu.addFolder(cat)
            for (let ob in prefabs[cat]) {
                if (!Array.isArray(prefabs[cat][ob])) {
                    let subCategory = category.addFolder(ob)
                    for (let ob2 in prefabs[cat][ob]) {
                        options[ob2] = (() => this.replaceObject(JSON.stringify(prefabs[cat][ob][ob2])))
                        subCategory.add(options, ob2).name(ob2)
                    }
                } else {
                    options[ob] = (() => this.replaceObject(JSON.stringify(prefabs[cat][ob])))
                    category.add(options, ob).name(ob)
                }
            }
        }
        
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
        
        let settingsMenu = this.mainMenu.addFolder('Settings')
        settingsMenu.add(options, "degToRad").name("Anti Radians").onChange(t => {this.setSettings('degToRad', t)})       
    }

    onLoad() {
        this.setupSettings()
        this.removeAd()
        this.addGui()
        this.addControls()
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
            

        GM_xmlhttpRequest({
            method: "GET",
            url: "https://krunker.io/editor.html",
            onload: res => {
                let html = res.responseText
                html = html.replace(' src="js/editor.js">', `>${Mod.toString()}\nwindow.mod = new Mod();\n${code.toString()}`)
                document.open()
                document.write(html)
                document.close()
            }
        })
    }
})
