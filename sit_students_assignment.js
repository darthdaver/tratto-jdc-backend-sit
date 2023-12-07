const fs = require('fs');
const axios = require('axios');
const dotenv = require('dotenv');
// Load configuration file and environment variables
dotenv.config({ path: ".env" });
const port = process.env.PORT || 3001;
const assignmentRepositoryPath = process.env.ASSIGNMENT_DB_PATH || './assignment_db/repositories';

async function getRepositories() {
    try {
        const allDirectoryFiles = fs.readdirSync(assignmentRepositoryPath);
        const directories = allDirectoryFiles.filter(file => fs.statSync(`${assignmentRepositoryPath}/${file}`).isDirectory());
        const repositories = [];
        for (const directory of directories) {
            const allClassesFiles = fs.readdirSync(`${assignmentRepositoryPath}/${directory}/classes`);
            const repositoryObj = JSON.parse(fs.readFileSync(`${assignmentRepositoryPath}/${directory}/repository.json`));
            const repository = {
                repository: repositoryObj,
                classes: []
            }
            for (const repositoryClass of allClassesFiles) {
                const repositoryClassObj = JSON.parse(fs.readFileSync(`${assignmentRepositoryPath}/${directory}/classes/${repositoryClass}`));
                repository.classes.push(repositoryClassObj);
            }
            repositories.push(repository);
        }
        return repositories;
    } catch (error) {
        console.error(error);
        return []
    }
}
async function createUserRepository(repository) {
    try {
        const result = await axios.post(`http://localhost:${port}/repositories`, { repository: repository.repository });
        await new Promise(resolve => setTimeout(resolve, 100));
        const repositoryData = result.data;
        const repositoryId = repositoryData._id;
        console.log(`Assigned repository: ${repositoryData.projectName}`);

        const userRepositoryId = {
            _id: repositoryData._id,
            name: repositoryData.projectName
        };

        for (const repositoryClass of repository.classes) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const result = await axios.post(`http://localhost:${port}/repositories/${repositoryId}/repositoryClasses`, { repositoryClass: { name: repositoryClass.name, jDoctorConditions: [] } });
            await new Promise(resolve => setTimeout(resolve, 500));
            const repositoryClassData = result.data;
            const repositoryClassId = repositoryClassData._id;
            console.log(`Assigned repository class: ${repositoryClassData.name}`);
            for (const jDoctorCondition of repositoryClass.jDoctorConditions) {
                const result = await axios.post(`http://localhost:${port}/repositories/${repositoryId}/repositoryClasses/${repositoryClassId}/jdoctorconditions`, { jDoctorCondition: jDoctorCondition });
                await new Promise(resolve => setTimeout(resolve, 100));
                const jDoctorConditionData = result.data;
                const jDoctorConditionId = jDoctorConditionData._id;
                console.log(`Uploaded JDoctorCondition: ${jDoctorConditionData.operation.name}`);
            }
        }
        return userRepositoryId;
    } catch (error) {
        console.error(error);
    }
}

(async function uploadStudents() {
    try{
        const students_credentials = JSON.parse(fs.readFileSync('sit_students_passwords.json', 'utf8'));
        const repositories = await getRepositories();
        const students = [];
        let idx = 0;
        for (const student of students_credentials) {
            const repositoryId = await createUserRepository(repositories[idx%repositories.length]);
            idx++;
            const studentObj = {
                email: student.email,
                password: student.password,
                repositories: [repositoryId]
            };
            console.log(`Processed student: ${studentObj.email}`);
            console.log(studentObj);
            const result = await axios.post(`http://localhost:${port}/users/signup`, studentObj);
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log(`Student added.`)
            students.push(studentObj);
        }
        fs.writeFileSync('sit_students_passwords_assignment.json', JSON.stringify(students, null, 4), (err) => {
            if (err) {
                console.error(err);
                return;
            }
            console.log("JSON data has been saved.");
        });
    } catch (error) {
        console.error(error);
    }
})();
