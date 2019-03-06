const convert = require('xml-js')
const fs = require("fs")
const _ = require("lodash")

fs.readFile('./src/documents/My Family T1.U3.L3 Final/word/document.xml', (err, data)=>{
// fs.readFile('./src/documents/My Clothes T1U1L7 - FINAL/word/document.xml', (err, data)=>{
// fs.readFile('./src/documents/T1U1L1 Directions (1)/word/document.xml', (err, data)=>{
  if (err) throw err
  readMyData(data)
})
const readMyData = async (data) =>{
  // console.log(data)
  const xml = data;
  const result1 = convert.xml2json(xml, {compact: true, spaces: 4})
  const result2 = convert.xml2json(xml, {compact: false, spaces: 4})
  
  const jsonRes = JSON.parse(result2)

  // console.log(Object.keys(jsonRes['w:document']['w:body']))
  const textArr = getText(jsonRes)

  fs.writeFile('./src/myJSON.JSON',JSON.stringify(textArr), err=>{
    if(err) throw err
  })


  const myObj = parseText(textArr)
  fs.writeFile('./src/myParsedObj.JSON',JSON.stringify(myObj), err=>{
    if(err) throw err
  })
}

function parseText(textArr){
  let slides= {}
  const defaultSlide = {
    actions: [],
    tips: []
  }
  let lesson = {
    title: '',
    description: '',
    objectives: [],
    wordList: '',
    images: ''
  }
  let actionText = ``
  let checkSlideNumber = false
  let checkStudentActions = false
  let fillActions = false
  let fillTips = false
  let lessonDescription = false
  let learningObjectives = false
  let wordList = false
  let images = false

  const resetValues = ()=>{
    actionText = ``
    checkSlideNumber = false
    checkStudentActions = false
    fillActions = false
    fillTips = false
    learningObjectives = false
    wordList = false
    lessonDescription = false
  }
  let slideNum = 0

  textArr.forEach(text=>{
    if(lesson.title == '' && text.toLowerCase().includes('title:')){
      lesson.title = text.substring(7) //the position after ": " in title
    }
    if(lessonDescription){
      if(text.toLowerCase().includes('student learning objectives')){
        learningObjectives = true
        lessonDescription = false
        return
      }else{
        lesson.description += text
      }
    }
    if(text.toLowerCase().includes('student learning objectives') || learningObjectives){
      learningObjectives = true
      if(!text.toLowerCase().includes('at completion of this lesson,')){
        if(text.toLowerCase().includes('word list')){
          if(actionText != ``)
            lesson.objectives.push(actionText)
          resetValues()
          wordList = true
        } else if(text.toLowerCase().includes('images')){
          if(actionText != ``)
            lesson.objectives.push(actionText)
          resetValues()
          images = true
        }else if (text.includes('.') || text.includes('!') || text.includes('?')){
          lesson.objectives.push(actionText + text)
          actionText = ``
        }else if(text[0] != ' ' && actionText != ``){
          lesson.objectives.push(actionText)
          actionText = text
        } else{
          actionText += text
        }
      }
      return
    }
    if(images){
      if(text.toLowerCase().includes('word list')){
        images = false
        wordList = true
      } else{
        lesson.images += text
      }
    }
    if(wordList){
      if(text.toLowerCase().includes('opener/greeting')){
        wordList = false
      } else{
        lesson.wordList += text
      }
    }
    if(lesson.description == '' && text.toLowerCase().includes('lesson description text')){
      lessonDescription = true
      return
    }
    if(checkSlideNumber){
      let textNumber = (text.match(/\d+/g) || []).find(Number)
      if(textNumber) {
        slideNum = slideNum * 10 + ~~textNumber
        slides[slideNum] = {
          actions: [],
          tips: []
        }
        resetValues()
        checkStudentActions = true
        return
      }
      slides[slideNum] = {
        actions: [],
        tips: []
      }
      resetValues()
      checkStudentActions = true
    }
    if(checkStudentActions){
      if(text.toLowerCase().includes(`student actions/output`)){
        fillActions = true
        checkStudentActions = false
        return
      }
    }
    if(fillActions){
      if(text.toLowerCase().includes(`teaching tips`)){
        if(actionText != ``)
          slides[slideNum].actions.push(actionText)
        resetValues()
        fillTips = true
      } else if (text.includes('.') || text.includes('!') || text.includes('?')){
        slides[slideNum].actions.push(actionText + text)
        actionText = ``
      }else if(text[0] != ' ' && actionText != ``){
        slides[slideNum].actions.push(actionText)
        actionText = text
      } else{
        actionText = actionText + text
      }
      return
    }
    if(fillTips){
      if ((text.toLowerCase().includes(`slide`) && (hasNumber(text) || text.toLowerCase().includes('number')))|| 
        text.toLowerCase().includes(`conversation activities slides`))
      {
        if(actionText != ``){
          slides[slideNum].tips.push(actionText)
        }
        resetValues()
      } else if (text.includes('.') || text.includes('!') || text.includes('?')){
        slides[slideNum].tips.push(actionText + text)
        actionText = ``
      } else{
        actionText = actionText + text
      }

    }
    if (text.toLowerCase().includes(`slide`)){
      if(hasNumber(text)) {
        slideNum = ~~text.match(/\d+/g).find(Number)
        checkSlideNumber = true
      }else if(text.toLowerCase().includes('number')){
        slideNum = null
        checkSlideNumber = true
      }
    }
  })
  lesson.slides = slides
  console.log(lesson)
  return lesson
}

function getText(obj) {
  let text = [];
  Object.keys(obj).forEach(key => {
    if (key == "text") {
      text.push(obj[key]);
    }
    if (typeof obj[key] == "object") {
      text.push(getText(obj[key]));
    }
  });
  const flatten = function(arr, result = []) {
    for (let i = 0, length = arr.length; i < length; i++) {
      const value = arr[i];
      if (Array.isArray(value)) {
        flatten(value, result);
      } else {
        result.push(value);
      }
    }
    return result;
  };
  return flatten(text);
}

function hasNumber(myString) {
  return /\d/.test(myString);
}