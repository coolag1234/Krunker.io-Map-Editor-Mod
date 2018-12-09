// ==UserScript==
// @name         Krunker.io Map Editor Mod
// @description  Krunker.io Map Editor Mod
// @updateURL    https://github.com/Tehchy/Krunker.io-Map-Editor-Mod/raw/master/userscript.user.js
// @downloadURL  https://github.com/Tehchy/Krunker.io-Map-Editor-Mod/raw/master/userscript.user.js
// @version      0.8
// @author       Tehchy
// @match        https://krunker.io/editor.html
// @require      https://github.com/Tehchy/Krunker.io-Map-Editor-Mod/raw/master/prefabs.js
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
            degToRad: false /// Change to true JustProb <3
        }
        this.copy = null
        this.rotation = 0
        this.prefabMenu = null
        this.onLoad()
    }

    objectSelected() {
        let selected = this.hooks.config.transformControl.object
        return selected ? selected : false
    }

    replaceObject(str) {
        let selected = this.objectSelected()
        if (!selected) {
            //this.hooks.config.addObject(this.hooks.object.defaultFromType("CUBE"))
            //selected = this.objectSelected()
        }
        if (selected) {
            this.hooks.config.removeObject()
            
            let jsp = JSON.parse(str);
            jsp = jsp.objects ? jsp.objects : jsp
            let sub = [jsp[0].p[0], jsp[0].p[1], jsp[0].p[2]]
            for (let ob of jsp) {
               if (this.rotation > 0) {
                    ob = this.rotateObject(ob, this.rotation)
                }
                
                ob.p[0] += selected.userData.owner.position.x - sub[0]
                ob.p[1] += selected.userData.owner.position.y - (selected.scale.y / 2) - sub[1]
                ob.p[2] += selected.userData.owner.position.z - sub[2]
                this.hooks.config.addObject(this.hooks.object.deserialize(ob))
            }
            this.rotation = 0
            this.prefabMenu.__controllers[0].setValue(this.rotation)
        } else {
            alert("You must select a object first")
        }
    }
    
    rotateObject(ob, rotation = 90) {
        switch (rotation) {
            case 90: return this.changeAngle(ob)
            case 180: return this.reflectAngle(ob)
            case 270: return this.reflectAngle(this.changeAngle(ob))
            default: return ob
        }
    }
    
    changeAngle(ob){
        //Credit JustProb
        var x = ob.s[0]
        var y = ob.s[2]
        ob.s[0] = y
        ob.s[2] = x
        var a = ob.p[0]
        var b = ob.p[2]
        ob.p[0] = b
        ob.p[2] = a
        
        return ob
    }

    reflectAngle(ob){
        //Credit JustProb
        ob.p[0] = -1 * ob.p[0]
        ob.p[2] = -1 * ob.p[2]
        
        return ob
    }
    
    copyObjects(cut = false) {
        let selected = this.objectSelected()
        var pos = {
            minX: selected.position.x - (selected.scale.x / 2), 
            minY: selected.position.y, 
            minZ: selected.position.z - (selected.scale.z / 2),  
            maxX: selected.position.x + (selected.scale.x / 2), 
            maxY: selected.position.y + selected.scale.y, 
            maxZ: selected.position.z + (selected.scale.z / 2), 
        }
        var intersect = []
        var obbys = []
        for (var i = 0; i < this.hooks.config.objInstances.length; i++) {
            if (this.hooks.config.objInstances[i].uuid == selected.uuid) continue
            var ob = this.hooks.config.objInstances[i].boundingMesh
            if (this.intersect({
                    minX: ob.position.x - (ob.scale.x / 2), 
                    minY: ob.position.y, 
                    minZ: ob.position.z - (ob.scale.z / 2), 
                    maxX: ob.position.x + (ob.scale.x / 2), 
                    maxY: ob.position.y + ob.scale.y, 
                    maxZ: ob.position.z + (ob.scale.z / 2)
                }, pos)) {
                obbys.push(this.hooks.config.objInstances[i])
                intersect.push(this.hooks.config.objInstances[i].serialize())
            }
        }
        if (cut && obbys.length ) {
            for (var i = 0; i < obbys.length; i++) {
                this.hooks.config.removeObject(obbys[i])
            }
        }
        this.copy = JSON.stringify(intersect)
    }
        
    intersect(a, b) {
        return (a.minX <= b.maxX && a.maxX >= b.minX) &&
            (a.minY <= b.maxY && a.maxY >= b.minY) &&
            (a.minZ <= b.maxZ && a.maxZ >= b.minZ);
    }

    addButtons() {
        document.getElementById("bottomBar").insertAdjacentHTML('beforeend', '<div class="bottomPanel"><div id="copyObjects" class="bottomButton">Copy Objects</div><div id="cutObjects" class="bottomButton">Cut Objects</div><div id="pasteObjects" class="bottomButton">Paste Objects</div><div id="saveObjects" class="bottomButton">Save Objects</div></div>');
        document.getElementById("copyObjects").addEventListener("click", t => {  
            let selected = this.objectSelected()
            if (!selected){
                return alert('Stretch a cube over your objects then click copy')
            }
            this.copyObjects()
        })
        
        document.getElementById("cutObjects").addEventListener("click", t => {  
            let selected = this.objectSelected()
            if (!selected){
                return alert('Stretch a cube over your objects then click cut')
            }
            this.copyObjects(true)
        })
        
        document.getElementById("pasteObjects").addEventListener("click", t => {  
            let selected = this.objectSelected()
            if (!selected){
                return alert('Select a object you would like to replace with your copied objects')
            }
            if (!this.copy) {
                return alert('Please copy objects first')
            }
            this.replaceObject(this.copy)
        })
        
        document.getElementById("saveObjects").addEventListener("click", t => {  
            if (!this.copy) {
                return alert('Please copy objects first')
            }
            var nme = prompt("Name your prefab", "");
            if (nme == null) {
                return alert('Please name your prefab')
            }
            this.download(this.copy, 'prefab_' + nme.replace(/ /g,"_") + '.txt', 'text/plain');
        })
        
        document.getElementById("deleteObject").insertAdjacentHTML('beforebegin', '<div id="replaceObject" class="bottomButton">Replace Object</div>');
        document.getElementById("replaceObject").addEventListener("click", t => {
            var json = prompt("Import Object Json", "");
            if (json != null && this.objectSelected()) {
                this.replaceObject(json)
            }
        })
    }

    setupMenu() {
        this.prefabMenu = this.hooks.gui.addFolder("Prefabs");
        let createObjects = {
            rotation: 0
        }
        let prefabs = localStorage.getItem('krunk_prefabs') ? JSON.parse(localStorage.getItem('krunk_prefabs')) : {}
        this.prefabMenu.add(createObjects, "rotation", 0, 270, 90).name("Rotation").onChange(t => {this.rotation = t})               
        for (let cat in prefabs) {
            var category = this.prefabMenu.addFolder(cat)
            for (let ob in prefabs[cat]) {
                createObjects[ob] = (() => this.replaceObject(JSON.stringify(prefabs[cat][ob])))
                category.add(createObjects, ob).name(ob)
            }
        }
    }
    
    download(content, fileName, contentType) {
        //Credit to - https://stackoverflow.com/a/34156339
        var a = document.createElement("a");
        var file = new Blob([content], {type: contentType});
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

    onLoad() {
        this.addButtons()
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
            .replace(/this\.transformControl\.update\(\)/, 'this.transformControl.update(),window.mod.hooks.config = this')
            .replace(/\[\],(\w+).open\(\),/, '[],$1.open(),window.mod.hooks.gui=$1,window.mod.setupMenu(),')
            .replace(/initScene\(\){this\.scene=new (\w+).Scene,/, 'initScene(){this.scene=new $1.Scene,window.mod.hooks.three = $1,')
            .replace(/{(\w+)\[(\w+)\]\=(\w+)}\);this\.objConfigOptions/, '{$1[$2]=$2 == "rot" ? window.mod.degToRad($3) : $3});this.objConfigOptions')

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
